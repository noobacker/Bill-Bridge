import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get the sale details
    const sale = await db.sale.findUnique({
      where: {
        id: params.id,
      },
      include: {
        invoice: true,
      },
    })

    if (!sale) {
      return new NextResponse("Sale not found", { status: 404 })
    }

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Return quantity to production batch
      await tx.productionBatch.update({
        where: { id: sale.productionBatchId },
        data: {
          remainingQuantity: {
            increment: sale.quantity,
          },
        },
      })

      // Delete the transaction record
      await tx.transaction.deleteMany({
        where: {
          invoiceId: sale.invoiceId,
        },
      })

      // Delete the sale
      await tx.sale.delete({
        where: {
          id: params.id,
        },
      })

      // Check if this is the only sale for this invoice
      const otherSales = await tx.sale.findMany({
        where: {
          invoiceId: sale.invoiceId,
          id: {
            not: params.id,
          },
        },
      })

      // If no other sales, delete the invoice too
      if (otherSales.length === 0) {
        await tx.invoice.delete({
          where: {
            id: sale.invoiceId,
          },
        })
      }

      return { success: true }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[SALE_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { quantity, rate, amount, isGst, cgstRate, sgstRate, cgstAmount, sgstAmount, totalAmount } = body

    // Get the current sale
    const currentSale = await db.sale.findUnique({
      where: {
        id: params.id,
      },
      include: {
        invoice: true,
        productionBatch: true,
      },
    })

    if (!currentSale) {
      return new NextResponse("Sale not found", { status: 404 })
    }

    // Calculate stock difference
    const quantityDifference = quantity - currentSale.quantity

    // Check if there's enough stock if quantity is increased
    if (quantityDifference > 0) {
      const availableStock = currentSale.productionBatch.remainingQuantity
      if (availableStock < quantityDifference) {
        return new NextResponse("Insufficient stock in the production batch", { status: 400 })
      }
    }

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Update the sale
      const sale = await tx.sale.update({
        where: {
          id: params.id,
        },
        data: {
          quantity,
          rate,
          amount,
        },
      })

      // Update the production batch stock
      if (quantityDifference !== 0) {
        await tx.productionBatch.update({
          where: { id: currentSale.productionBatchId },
          data: {
            remainingQuantity: {
              decrement: quantityDifference,
            },
          },
        })
      }

      // Update the invoice
      await tx.invoice.update({
        where: {
          id: currentSale.invoiceId,
        },
        data: {
          isGst,
          subtotal: amount,
          cgstRate: isGst ? cgstRate : 0,
          sgstRate: isGst ? sgstRate : 0,
          cgstAmount: isGst ? cgstAmount : 0,
          sgstAmount: isGst ? sgstAmount : 0,
          totalAmount,
          pendingAmount: totalAmount - currentSale.invoice.paidAmount,
        },
      })

      // Update the transaction record
      await tx.transaction.updateMany({
        where: {
          invoiceId: currentSale.invoiceId,
        },
        data: {
          amount: totalAmount,
        },
      })

      return sale
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[SALE_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
