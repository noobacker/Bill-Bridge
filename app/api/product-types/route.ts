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
    const { name, hsnNumber, description, isService, cgstRate, sgstRate, igstRate } = body

    if (!name || !hsnNumber) {
      return new NextResponse("Name and HSN number are required", { status: 400 })
    }

    // Check if product type already exists
    const existingType = await db.productType.findUnique({
      where: { name },
    })

    if (existingType) {
      return new NextResponse("Product type with this name already exists", { status: 400 })
    }

    const productType = await db.productType.create({
      data: {
        name,
        hsnNumber,
        description: description || null,
        isService: isService || false,
        cgstRate: cgstRate || 9,
        sgstRate: sgstRate || 9,
        igstRate: igstRate || 0,
      },
    })

    return NextResponse.json(productType)
  } catch (error) {
    console.error("[PRODUCT_TYPES_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const productTypes = await db.productType.findMany({
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(productTypes)
  } catch (error) {
    console.error("[PRODUCT_TYPES_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
