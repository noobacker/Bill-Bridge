import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { id } = await params
    const {
      invoiceNumber,
      partnerId,
      invoiceDate,
      productTypeId,
      rate,
      amount,
      cgstAmount,
      sgstAmount,
      igstAmount = 0,
      totalAmount,
      isGst,
      paymentType,
      paymentStatus,
      paidAmount,
      pendingAmount,
      remarks,
      transportMode,
      batchSelections,
    } = body

    // Check if this is an invoice details update or a product update
    const isProductUpdate = productTypeId && batchSelections && batchSelections.length > 0
    const isInvoiceUpdate = invoiceNumber && partnerId

    if (!isProductUpdate && !isInvoiceUpdate) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Get the current invoice and its sales
    const currentInvoice = await db.invoice.findUnique({
      where: { id },
      include: {
        sales: true,
      },
    })

    if (!currentInvoice) {
      return new NextResponse("Invoice not found", { status: 404 })
    }
    
    // If invoice number is changing, check that the new number is unique
    if (invoiceNumber && invoiceNumber !== currentInvoice.invoiceNumber) {
      const existingInvoice = await db.invoice.findFirst({
        where: { 
          invoiceNumber: invoiceNumber,
          id: { not: id } // Exclude current invoice
        },
      })

      if (existingInvoice) {
        return new NextResponse(`Invoice number ${invoiceNumber} already exists. Please use a different invoice number.`, { status: 400 })
      }
    }

    // Validate batch selections if this is a product update
    if (isProductUpdate) {
      for (const selection of batchSelections) {
        const { batchId, quantity: selectionQuantity } = selection

        // Check if the batch exists
        const batch = await db.productionBatch.findUnique({
          where: { id: batchId },
        })

        if (!batch) {
          return new NextResponse(`Production batch not found: ${batchId}`, { status: 404 })
        }

        // Get existing sale for this batch if any
        const existingSale = currentInvoice.sales.find(sale => sale.productionBatchId === batchId)
        const existingQuantity = existingSale ? existingSale.quantity : 0
        
        // Check if there's enough stock (current remaining + existing quantity should be >= new quantity)
        if (batch.remainingQuantity + existingQuantity < selectionQuantity) {
          return new NextResponse(
            `Insufficient stock in batch ${batchId}. Only ${batch.remainingQuantity + existingQuantity} bricks available.`, 
            { status: 400 }
          )
        }
      }
    }

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Update the invoice details
      const invoiceUpdateData: any = {
        partnerId: partnerId || currentInvoice.partnerId,
      }
      
      if (invoiceNumber) {
        invoiceUpdateData.invoiceNumber = invoiceNumber
      }
      
      if (invoiceDate) {
        invoiceUpdateData.invoiceDate = new Date(invoiceDate)
      }
      
      if (isGst !== undefined) {
        invoiceUpdateData.isGst = isGst
      }
      
      if (paymentType) {
        invoiceUpdateData.paymentType = paymentType
      }
      if (paymentStatus) {
        invoiceUpdateData.paymentStatus = paymentStatus
      }
      if (paidAmount !== undefined) {
        invoiceUpdateData.paidAmount = paidAmount
      }
      if (pendingAmount !== undefined) {
        invoiceUpdateData.pendingAmount = pendingAmount
      }
      
      if (remarks !== undefined) {
        invoiceUpdateData.remarks = remarks || null
      }
      
      if (transportMode !== undefined) {
        invoiceUpdateData.transportMode = transportMode || null
      }
      
      // If this is a product update, update amounts as well
      if (isProductUpdate && amount !== undefined) {
        invoiceUpdateData.subtotal = amount
        invoiceUpdateData.cgstAmount = cgstAmount || 0
        invoiceUpdateData.sgstAmount = sgstAmount || 0
        invoiceUpdateData.totalAmount = totalAmount
        invoiceUpdateData.pendingAmount = totalAmount - currentInvoice.paidAmount
      }
      
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: invoiceUpdateData,
      })

      // If this is a product update, handle batch selections
      if (isProductUpdate) {
        // Create a map of existing sales by batch ID
        const existingSalesByBatchId = new Map()
        for (const sale of currentInvoice.sales) {
          existingSalesByBatchId.set(sale.productionBatchId, sale)
        }

        // Process each batch selection
        for (const selection of batchSelections) {
          const { batchId, quantity: selectionQuantity } = selection
          
          if (selectionQuantity <= 0) continue;
          
          const selectionAmount = selectionQuantity * rate;
          const existingSale = existingSalesByBatchId.get(batchId)
          
          if (existingSale) {
            // Update existing sale
            await tx.sale.update({
              where: { id: existingSale.id },
              data: {
                productTypeId,
                quantity: selectionQuantity,
                rate,
                amount: selectionAmount,
              },
            })
            
            // Update batch quantity (adjust by the difference)
            const quantityDifference = selectionQuantity - existingSale.quantity
            if (quantityDifference !== 0) {
              await tx.productionBatch.update({
                where: { id: batchId },
                data: {
                  remainingQuantity: {
                    decrement: quantityDifference,
                  },
                },
              })
            }
            
            // Remove this batch from the map to track which ones we've processed
            existingSalesByBatchId.delete(batchId)
          } else {
            // Create new sale record
            await tx.sale.create({
              data: {
                invoiceId: id,
                productTypeId,
                productionBatchId: batchId,
                quantity: selectionQuantity,
                rate,
                amount: selectionAmount,
              },
            })
            
            // Update batch quantity
            await tx.productionBatch.update({
              where: { id: batchId },
              data: {
                remainingQuantity: {
                  decrement: selectionQuantity,
                },
              },
            })
          }
        }
        
        // Delete any sales that were removed (not in the new batch selections)
        for (const [batchId, sale] of existingSalesByBatchId.entries()) {
          // Return quantity to the batch
          await tx.productionBatch.update({
            where: { id: batchId },
            data: {
              remainingQuantity: {
                increment: sale.quantity,
              },
            },
          })
          
          // Delete the sale
          await tx.sale.delete({
            where: { id: sale.id },
          })
        }
      }

      // --- Recalculate invoice totals from all sales (always, after any update) ---
      const allSales = await tx.sale.findMany({ where: { invoiceId: id } });
      let subtotal = 0;
      for (const sale of allSales) {
        subtotal += sale.amount;
      }
      // Use invoice GST rates if present, else default to 0
      const cgstRate = updatedInvoice.cgstRate ?? 0;
      const sgstRate = updatedInvoice.sgstRate ?? 0;
      const igstRate = updatedInvoice.igstRate ?? 0;
      const cgstAmountSum = updatedInvoice.isGst ? subtotal * cgstRate / 100 : 0;
      const sgstAmountSum = updatedInvoice.isGst ? subtotal * sgstRate / 100 : 0;
      const igstAmountSum = updatedInvoice.isGst ? subtotal * igstRate / 100 : 0;
      const totalAmountFinal = subtotal + cgstAmountSum + sgstAmountSum + igstAmountSum;

      const finalInvoice = await tx.invoice.update({
        where: { id },
        data: {
          subtotal,
          cgstAmount: cgstAmountSum,
          sgstAmount: sgstAmountSum,
          igstAmount: igstAmountSum,
          totalAmount: totalAmountFinal,
          pendingAmount: totalAmountFinal - (updatedInvoice.paidAmount ?? 0),
        },
      });

      return finalInvoice;
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[MULTI_BATCH_SALES_PATCH]", error)
    return new NextResponse(error.message || "Internal Error", { status: 500 })
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        partner: true,
        sales: {
          include: {
            productType: true,
            productionBatch: {
              include: {
                storageLocation: true
              }
            }
          }
        }
      }
    })

    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error: any) {
    console.error("[MULTI_BATCH_SALES_GET]", error)
    return new NextResponse(error.message || "Internal Error", { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id: invoiceId } = await params

    // Get the invoice with its sales to restore inventory quantities
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        sales: {
          include: {
            productionBatch: true
          }
        }
      },
    })

    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 })
    }

    // Start a transaction to ensure data consistency
    await db.$transaction(async (tx) => {
      // Restore quantities to production batches
      for (const sale of invoice.sales) {
        if (sale.productionBatchId) {
          await tx.productionBatch.update({
            where: { id: sale.productionBatchId },
            data: {
              remainingQuantity: {
                increment: sale.quantity
              }
            }
          })
        }
      }

      // Delete the sales first
      await tx.sale.deleteMany({
        where: { invoiceId: invoiceId }
      })

      // Then delete the invoice
      await tx.invoice.delete({
        where: { id: invoiceId }
      })
    })

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    console.error("[MULTI_BATCH_SALES_DELETE]", error)
    return new NextResponse(error.message || "Internal Error", { status: 500 })
  }
} 