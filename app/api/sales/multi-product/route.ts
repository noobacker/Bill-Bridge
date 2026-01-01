import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { SaleItem } from "@/components/sales/types"

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
      isGst,
      paymentType,
      paymentStatus,
      paidAmount,
      pendingAmount,
      remarks,
      transportMode,
      items,
      subtotal,
      cgstAmount,
      sgstAmount,
      igstAmount = 0, // IGST will be calculated per product
      totalAmount,
      // Add transportation fields
      transportationId,
      driverName,
      driverPhone,
      transportVehicle,
      deliveryCity,
    } = body

    if (!invoiceNumber || !partnerId || !items || items.length === 0) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const existingInvoice = await db.invoice.findFirst({
      where: { invoiceNumber: invoiceNumber },
    })

    if (existingInvoice) {
      return new NextResponse(`Invoice number ${invoiceNumber} already exists. Please use a different invoice number.`, { status: 400 })
    }

    const productTypesFromDb = await db.productType.findMany({
        where: { id: { in: items.map((item: SaleItem) => item.productTypeId) } }
    });
    const productTypesMap = new Map(productTypesFromDb.map(pt => [pt.id, pt]));

    // Validate batch selections and stock for all items
    for (const item of items) {
      const productType = productTypesMap.get(item.productTypeId)
      if (!productType) {
        return new NextResponse(`Product with ID ${item.productTypeId} not found.`, { status: 404 });
      }

      // Skip validation if no batches are selected
      if (item.batchSelections.length === 0) {
        continue;
      }

      // Check if product is a service - using optional chaining to safely access the property
      const isService = productType?.isService === true;
      
      if (isService) {
        if (item.batchSelections[0].quantity <= 0) {
          return new NextResponse(`Quantity for service ${productType.name} must be greater than 0.`, { status: 400 });
        }
        continue;
      }
      
      for (const selection of item.batchSelections) {
        const batch = await db.productionBatch.findUnique({
          where: { id: selection.batchId },
        })

        if (!batch) {
          return new NextResponse(`Production batch not found: ${selection.batchId}`, { status: 404 })
        }
        if (batch.remainingQuantity < selection.quantity) {
          return new NextResponse(`Insufficient stock in batch ${batch.id}. Only ${batch.remainingQuantity} available.`, { status: 400 })
        }
      }
    }

    const result = await db.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          partnerId,
          invoiceDate: new Date(invoiceDate),
          subtotal,
          cgstAmount,
          sgstAmount,
          totalAmount,
          isGst,
          paymentType,
          paymentStatus,
          paidAmount,
          pendingAmount,
          remarks: remarks || null,
          transportMode: transportMode || null,
          transportationId: transportationId || null,
          driverName: driverName || null,
          driverPhone: driverPhone || null,
          transportVehicle: transportVehicle || null,
          deliveryCity: deliveryCity || null,
        } as any,
      })

      for (const item of items) {
        const productType = productTypesMap.get(item.productTypeId);
        
        // Handle case with no batch selections - create a single sale entry
        if (item.batchSelections.length === 0) {
          // Default to 1 quantity if no batches specified
          const defaultQuantity = 1;
          const saleAmount = defaultQuantity * item.rate;
          
          await tx.sale.create({
            data: {
              invoiceId: invoice.id,
              productTypeId: item.productTypeId,
              productionBatchId: null, // No batch associated
              quantity: defaultQuantity,
              rate: item.rate,
              amount: saleAmount,
            },
          });
          continue;
        }

        // Check if product is a service - using optional chaining to safely access the property
        const isService = productType?.isService === true;
        
        if (isService) {
          const serviceQuantity = item.batchSelections[0]?.quantity;
          if (serviceQuantity && serviceQuantity > 0) {
            const saleAmount = serviceQuantity * item.rate;
            await tx.sale.create({
              data: {
                invoiceId: invoice.id,
                productTypeId: item.productTypeId,
                productionBatchId: null,
                quantity: serviceQuantity,
                rate: item.rate,
                amount: saleAmount,
              } as any,
            })
          }
        } else {
          for (const selection of item.batchSelections) {
            if (selection.quantity > 0) {
              const saleAmount = selection.quantity * item.rate;
              await tx.sale.create({
                data: {
                  invoiceId: invoice.id,
                  productTypeId: item.productTypeId,
                  productionBatchId: selection.batchId,
                  quantity: selection.quantity,
                  rate: item.rate,
                  amount: saleAmount,
                },
              })

              await tx.productionBatch.update({
                where: { id: selection.batchId },
                data: {
                  remainingQuantity: {
                    decrement: selection.quantity,
                  },
                },
              })
            }
          }
        }
      }

      return invoice
    }, { timeout: 20000 })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[MULTI_PRODUCT_SALES_POST]", error)
    return new NextResponse(error.message || "Internal Error", { status: 500 })
  }
} 