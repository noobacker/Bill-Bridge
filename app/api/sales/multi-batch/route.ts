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
      invoiceNumber,
      partnerId,
      invoiceDate,
      productTypeId,
      rate,
      amount,
      cgstAmount,
      sgstAmount,
      totalAmount,
      cgstRate,
      sgstRate,
      isGst,
      paymentType,
      paymentStatus,
      remarks,
      transportMode,
      quantity,
      batchSelections,
    } = body

    if (!invoiceNumber || !partnerId || !productTypeId || !batchSelections || batchSelections.length === 0) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if invoice number already exists
    const existingInvoice = await db.invoice.findFirst({
      where: { invoiceNumber: invoiceNumber },
    })

    if (existingInvoice) {
      return new NextResponse(`Invoice number ${invoiceNumber} already exists. Please use a different invoice number.`, { status: 400 })
    }

    // Validate batch selections
    for (const selection of batchSelections) {
      const { batchId, quantity: selectionQuantity } = selection

      // Check if the batch exists
      const batch = await db.productionBatch.findUnique({
        where: { id: batchId },
      })

      if (!batch) {
        return new NextResponse(`Production batch not found: ${batchId}`, { status: 404 })
      }

      // Check if there's enough stock
      if (batch.remainingQuantity < selectionQuantity) {
        return new NextResponse(`Insufficient stock in batch ${batch.id}. Only ${batch.remainingQuantity} bricks available.`, { status: 400 })
      }
    }

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Create the invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          partnerId,
          invoiceDate: new Date(invoiceDate),
          subtotal: amount,
          cgstAmount,
          sgstAmount,
          totalAmount,
          cgstRate,
          sgstRate,
          isGst,
          paymentType,
          paymentStatus,
          pendingAmount: totalAmount,
          remarks: remarks || null,
          transportMode: transportMode || null,
        },
      })

      // Create a sale record for each batch selection
      for (const selection of batchSelections) {
        const { batchId, quantity: selectionQuantity } = selection
        
        if (selectionQuantity <= 0) continue;
        
        const selectionAmount = selectionQuantity * rate;
        
        // Create the sale record
        await tx.sale.create({
          data: {
            invoiceId: invoice.id,
            productTypeId,
            productionBatchId: batchId,
            quantity: selectionQuantity,
            rate,
            amount: selectionAmount,
          },
        })

        // Update the production batch's remaining quantity
        await tx.productionBatch.update({
          where: { id: batchId },
          data: {
            remainingQuantity: {
              decrement: selectionQuantity,
            },
          },
        })
      }

      return invoice
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[MULTI_BATCH_SALES_POST]", error)
    return new NextResponse(error.message || "Internal Error", { status: 500 })
  }
} 