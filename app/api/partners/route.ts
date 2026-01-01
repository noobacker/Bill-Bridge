import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { name, type, contactName, phone, email, address, gstNumber, bankName, accountNumber, ifscCode } = body

    if (!name || !type) {
      return new NextResponse("Name and type are required", { status: 400 })
    }

    // Check if partner already exists
    const existingPartner = await db.partner.findFirst({
      where: { name },
    })

    if (existingPartner) {
      return new NextResponse("Partner with this name already exists", { status: 400 })
    }

    const partner = await db.partner.create({
      data: {
        name,
        type,
        contactName: contactName || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        gstNumber: gstNumber || null,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
      },
    })

    return NextResponse.json(partner)
  } catch (error) {
    console.error("[PARTNERS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const partners = await db.partner.findMany({
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(partners)
  } catch (error) {
    console.error("[PARTNERS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
