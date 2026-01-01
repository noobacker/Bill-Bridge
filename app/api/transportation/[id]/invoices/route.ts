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
    const transportationId = params.id
    const invoices = await db.invoice.findMany({
      where: { transportationId: transportationId } as any,
      orderBy: { createdAt: "desc" },
      include: { partner: true } as any,
    })
    const formatted = invoices.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      clientName: inv.partner?.name || "-",
      deliveryCity: inv.deliveryCity,
      transportVehicle: inv.transportVehicle,
      driverName: inv.driverName || '-',
      totalAmount: inv.totalAmount,
      paymentStatus: inv.paymentStatus,
    }))
    return NextResponse.json({ invoices: formatted })
  } catch (error: any) {
    console.error("[TRANSPORTATION_INVOICES_GET]", error)
    return new NextResponse(error.message || "Internal Error", { status: 500 })
  }
} 