import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if the product type is in use in production
    const usedInProduction = await db.productionBatch.findFirst({
      where: { productTypeId: params.id },
    })

    // Check if the product type is in use in sales
    const usedInSales = await db.sale.findFirst({
      where: { productTypeId: params.id },
    })

    if (usedInProduction || usedInSales) {
      let message = "Cannot delete this product type because it is ";
      
      if (usedInProduction && usedInSales) {
        message += "used in both production records and sales invoices.";
      } else if (usedInProduction) {
        message += "used in production records.";
      } else {
        message += "used in sales invoices.";
      }
      
      return new NextResponse(message, { status: 400 })
    }

    const deletedProductType = await db.productType.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json(deletedProductType)
  } catch (error) {
    console.error("[PRODUCT_TYPES_DELETE]", error)
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
    const { name, hsnNumber, description, isService, cgstRate, sgstRate, igstRate } = body

    if (!name || !hsnNumber) {
      return new NextResponse("Name and HSN number are required", { status: 400 })
    }

    const updatedProductType = await db.productType.update({
      where: {
        id: params.id,
      },
      data: {
        name,
        hsnNumber,
        description,
        isService,
        cgstRate,
        sgstRate,
        igstRate,
      } as Prisma.ProductTypeUpdateInput,
    })

    return NextResponse.json(updatedProductType)
  } catch (error) {
    console.error("[PRODUCT_TYPES_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
