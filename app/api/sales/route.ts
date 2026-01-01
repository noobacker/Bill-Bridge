import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getServerTimestamp } from "@/lib/server-timestamp"

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
      productionBatchId,
      quantity,
      rate,
      amount,
      cgstAmount,
      sgstAmount,
      totalAmount,
      cgstRate,
      sgstRate,
      isGst,
      paymentType,
      remarks,
      transportMode,
    } = body

    if (!invoiceNumber || !partnerId || !productTypeId || !productionBatchId || !quantity || !rate) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Check if invoice number already exists
    const existingInvoice = await db.invoice.findFirst({
      where: { invoiceNumber: invoiceNumber },
    })

    if (existingInvoice) {
      return new NextResponse(`Invoice number ${invoiceNumber} already exists. Please use a different invoice number.`, { status: 400 })
    }

    // Check if there's enough stock in the production batch
    const batch = await db.productionBatch.findUnique({
      where: { id: productionBatchId },
    })

    if (!batch) {
      return new NextResponse("Production batch not found", { status: 404 })
    }

    if (batch.remainingQuantity < quantity) {
      return new NextResponse(`Insufficient stock. Only ${batch.remainingQuantity} bricks available.`, { status: 400 })
    }

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Get current business timezone timestamp
      const businessTimestamp = await getServerTimestamp();
      
      // Create the invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          partnerId,
          invoiceDate: new Date(invoiceDate), // User can still backdate this
          subtotal: amount,
          cgstAmount,
          sgstAmount,
          totalAmount,
          cgstRate,
          sgstRate,
          isGst,
          paymentType,
          pendingAmount: totalAmount,
          remarks: remarks || null,
          transportMode: transportMode || null,
          createdAt: businessTimestamp, // This will use business timezone
        },
      })

      // Create the sale record
      await tx.sale.create({
        data: {
          invoiceId: invoice.id,
          productTypeId,
          productionBatchId,
          quantity,
          rate,
          amount,
          createdAt: businessTimestamp, // This will use business timezone
        },
      })

      // Update the production batch's remaining quantity
      await tx.productionBatch.update({
        where: { id: productionBatchId },
        data: {
          remainingQuantity: {
            decrement: quantity,
          },
        },
      })

      return invoice
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[SALES_POST]", error)
    return new NextResponse(error.message || "Internal Error", { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const invoices = await db.invoice.findMany({
      orderBy: {
        invoiceDate: "desc",
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            phone: true,
            contactName: true,
            email: true,
            gstNumber: true,
          },
        },
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

    return NextResponse.json(invoices)
  } catch (error) {
    console.error("[SALES_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 