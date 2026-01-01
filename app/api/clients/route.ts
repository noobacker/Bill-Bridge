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
    const { name, contactName, phone, email, address, gstNumber } = body

    if (!name) {
      return new NextResponse("Client name is required", { status: 400 })
    }

    const client = await db.client.create({
      data: {
        name,
        contactName: contactName || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        gstNumber: gstNumber || null,
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error("[CLIENTS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const clients = await db.client.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error("[CLIENTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
