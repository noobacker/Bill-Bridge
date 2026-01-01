import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const {
      invoiceId,
      productTypeId,
      rate,
      batchSelections,
    } = body

    if (!invoiceId || !productTypeId) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Get the current invoice
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        sales: {
          where: { productTypeId }
        }
      }
    })

    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 })
    }

    // Get product type information
    const productType = await db.productType.findUnique({
      where: { id: productTypeId }
    })

    if (!productType) {
      return new NextResponse(`Product type with ID ${productTypeId} not found.`, { status: 404 })
    }

    // For service products, we don't need to validate batches
    const isServiceProduct = productType.isService || false

    // Validate batch selections if provided and not a service product
    if (!isServiceProduct && batchSelections && batchSelections.length > 0) {
      for (const selection of batchSelections) {
        const { batchId, quantity } = selection
        
        // Skip service products or special batch IDs
        if (batchId.startsWith('service_')) continue
        
        // Check if the batch exists
        const batch = await db.productionBatch.findUnique({
          where: { id: batchId },
        })

        if (!batch) {
          return new NextResponse(`Production batch not found: ${batchId}`, { status: 404 })
        }

        // Check if there's enough stock
        if (batch.remainingQuantity < quantity) {
          return new NextResponse(
            `Insufficient stock in batch ${batchId}. Only ${batch.remainingQuantity} available.`, 
            { status: 400 }
          )
        }
      }
    }

    // Calculate amounts
    let totalQuantity = 0
    let totalAmount = 0
    
    // Calculate total quantity based on batch selections
    if (batchSelections && batchSelections.length > 0) {
      totalQuantity = batchSelections.reduce((sum: number, selection: { quantity: number }) => sum + selection.quantity, 0)
    } else if (isServiceProduct) {
      // For service products without explicit batch selections, use 1
      totalQuantity = 1
    }
    
    totalAmount = totalQuantity * rate
    
    const cgstRate = productType.cgstRate ?? 9
    const sgstRate = productType.sgstRate ?? 9
    const cgstAmount = invoice.isGst ? (totalAmount * cgstRate / 100) : 0
    const sgstAmount = invoice.isGst ? (totalAmount * sgstRate / 100) : 0
    const productTotalAmount = totalAmount + cgstAmount + sgstAmount

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Create sales records
      if (isServiceProduct || !batchSelections || batchSelections.length === 0) {
        // Create a single sale without batch for services or products without batches
        await tx.sale.create({
          data: {
            invoiceId,
            productTypeId,
            productionBatchId: null,
            quantity: totalQuantity || 1, // Use calculated total quantity or default to 1
            rate,
            amount: totalAmount || rate, // Use calculated amount or default to rate
          },
        })
      } else {
        // Create sales for each batch
        for (const selection of batchSelections) {
          const { batchId, quantity } = selection
          
          if (quantity <= 0) continue
          
          // For service products with special batch IDs
          if (batchId.startsWith('service_')) {
            await tx.sale.create({
              data: {
                invoiceId,
                productTypeId,
                productionBatchId: null,
                quantity,
                rate,
                amount: quantity * rate,
              },
            })
            continue
          }
          
          // For regular products with real batches
          await tx.sale.create({
            data: {
              invoiceId,
              productTypeId,
              productionBatchId: batchId,
              quantity,
              rate,
              amount: quantity * rate,
            },
          })
          
          // Update batch quantity
          await tx.productionBatch.update({
            where: { id: batchId },
            data: {
              remainingQuantity: {
                decrement: quantity,
              },
            },
          })
        }
      }

      // Update invoice totals
      // Recalculate invoice totals from all sales to avoid accumulation/doubling
      const updatedInvoice = await (async () => {
        const sales = await tx.sale.findMany({ where: { invoiceId } })
        const subtotalSum = sales.reduce((s, sale) => s + sale.amount, 0)
        const cgst = invoice.isGst ? (subtotalSum * (productType.cgstRate ?? 9) / 100) : 0
        const sgst = invoice.isGst ? (subtotalSum * (productType.sgstRate ?? 9) / 100) : 0
        const totalFinal = subtotalSum + cgst + sgst
        return tx.invoice.update({
          where: { id: invoiceId },
          data: {
            subtotal: subtotalSum,
            cgstAmount: cgst,
            sgstAmount: sgst,
            totalAmount: totalFinal,
            pendingAmount: totalFinal - (invoice.paidAmount ?? 0),
          },
        })
      })()

      return updatedInvoice
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[PRODUCTS_SALES_POST]", error)
    return new NextResponse(error.message || "Internal Error", { status: 500 })
  }
} 