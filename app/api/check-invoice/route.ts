import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get the invoice number from query params
    const searchParams = req.nextUrl.searchParams
    const invoiceNumber = searchParams.get('invoiceNumber')

    if (!invoiceNumber) {
      return NextResponse.json({ error: "Invoice number is required" }, { status: 400 })
    }

    // Check if the invoice number exists
    const existingInvoice = await db.invoice.findFirst({
      where: { invoiceNumber: invoiceNumber },
      select: { id: true }
    })

    return NextResponse.json({
      exists: !!existingInvoice,
      message: existingInvoice ? "Invoice with this number already exists" : "Invoice number is available"
    })
    
  } catch (error) {
    console.error("[CHECK_INVOICE_GET]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
} 