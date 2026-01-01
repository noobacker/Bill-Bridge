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
    const { name, contactName, phone, email, address, gstNumber, bankName, accountNumber, ifscCode } = body

    if (!name) {
      return new NextResponse("Vendor name is required", { status: 400 })
    }

    const vendor = await db.vendor.create({
      data: {
        name,
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

    return NextResponse.json(vendor)
  } catch (error) {
    console.error("[VENDORS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const vendors = await db.vendor.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    })

    return NextResponse.json(vendors)
  } catch (error) {
    console.error("[VENDORS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
