import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const invoice = await db.invoice.findUnique({
      where: { id: params.id },
      include: {
        partner: true,
        sales: {
          include: {
            productType: true,
            productionBatch: {
              include: {
                storageLocation: true,
              },
            },
          },
        },
      },
    })

    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("[INVOICE_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
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
      productionBatchId,
      quantity,
      rate,
      amount,
      cgstAmount,
      sgstAmount,
      totalAmount,
      isGst,
      paymentType,
      remarks,
      transportMode,
      // Add transportation fields
      transportationId,
      driverName,
      driverPhone,
      transportVehicle,
      deliveryCity,
    } = body

    // Get the current invoice and its sales
    const currentInvoice = await db.invoice.findUnique({
      where: { id: params.id },
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
        where: { invoiceNumber: invoiceNumber },
      })

      if (existingInvoice) {
        return new NextResponse(`Invoice number ${invoiceNumber} already exists. Please use a different invoice number.`, { status: 400 })
      }
    }
    
    // Get the current sale
    const currentSale = currentInvoice.sales[0]
    
    if (!currentSale) {
      return new NextResponse("Sale record not found", { status: 404 })
    }

    // If production batch is being changed, we need to check new batch availability
    if (productionBatchId && productionBatchId !== currentSale.productionBatchId) {
      // Check if there's enough stock in the new production batch
      const newBatch = await db.productionBatch.findUnique({
        where: { id: productionBatchId },
      })

      if (!newBatch) {
        return new NextResponse("New production batch not found", { status: 404 })
      }

      if (newBatch.remainingQuantity < quantity) {
        return new NextResponse(`Insufficient stock in the new batch. Only ${newBatch.remainingQuantity} bricks available.`, { status: 400 })
      }
    }

    // If quantity is changing, check if the new quantity is available
    if (productionBatchId === currentSale.productionBatchId && quantity > currentSale.quantity) {
      const additionalQuantity = quantity - currentSale.quantity
      
      const batch = await db.productionBatch.findUnique({
        where: { id: productionBatchId },
      })
      
      if (!batch) {
        return new NextResponse("Production batch not found", { status: 404 })
      }
      
      if (batch.remainingQuantity < additionalQuantity) {
        return new NextResponse(`Insufficient stock. Only ${batch.remainingQuantity} additional bricks available.`, { status: 400 })
      }
    }

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Update the invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: params.id },
        data: {
          partnerId,
          invoiceNumber: invoiceNumber || currentInvoice.invoiceNumber,
          invoiceDate: new Date(invoiceDate),
          subtotal: amount,
          cgstAmount,
          sgstAmount,
          totalAmount,
          cgstRate: currentInvoice.cgstRate,
          sgstRate: currentInvoice.sgstRate,
          isGst,
          paymentType,
          pendingAmount: totalAmount - currentInvoice.paidAmount,
          remarks: remarks || undefined,
          transportMode: transportMode || undefined,
          // Add transportation fields
          transportationId: transportationId || undefined,
          driverName: driverName || undefined,
          driverPhone: driverPhone || undefined,
          transportVehicle: transportVehicle || undefined,
          deliveryCity: deliveryCity || undefined,
        } as any,
      })

      // If production batch is changing, restore quantity to original batch first
      if (productionBatchId !== currentSale.productionBatchId) {
        // Restore quantity to original batch
        await tx.productionBatch.update({
          where: { id: currentSale.productionBatchId },
          data: {
            remainingQuantity: {
              increment: currentSale.quantity,
            },
          },
        })
        
        // Decrement quantity from new batch
        await tx.productionBatch.update({
          where: { id: productionBatchId },
          data: {
            remainingQuantity: {
              decrement: quantity,
            },
          },
        })
      } else if (quantity !== currentSale.quantity) {
        // Adjust the batch quantity based on the difference
        const quantityDifference = quantity - currentSale.quantity
        
        await tx.productionBatch.update({
          where: { id: productionBatchId },
          data: {
            remainingQuantity: {
              decrement: quantityDifference,
            },
          },
        })
      }

      // Update the sale record
      const updatedSale = await tx.sale.update({
        where: { id: currentSale.id },
        data: {
          productTypeId,
          productionBatchId,
          quantity,
          rate,
          amount,
        },
      })

      return { invoice: updatedInvoice, sale: updatedSale }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[INVOICE_UPDATE]", error)
    return new NextResponse(error.message || "Internal Error", { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get the current invoice and its sales
    const invoice = await db.invoice.findUnique({
      where: { id: params.id },
      include: {
        sales: true,
      },
    })

    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 })
    }

    // Start a transaction to ensure data consistency
    await db.$transaction(async (tx) => {
      // For each sale, restore the quantity to the production batch
      for (const sale of invoice.sales) {
        await tx.productionBatch.update({
          where: { id: sale.productionBatchId },
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

      // Delete the invoice
      await tx.invoice.delete({
        where: { id: params.id },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[INVOICE_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 