import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const transport = await db.transportation.findUnique({ where: { id } })
  if (!transport) return new NextResponse("Not found", { status: 404 })
  return NextResponse.json(transport)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 })
  }
  const { name, ownerName, phone, city, drivers } = await req.json()
  if (!name || !phone || !city) {
    return new NextResponse("Missing required fields", { status: 400 })
  }
  const updated = await db.transportation.update({
    where: { id },
    data: { name, ownerName, phone, city, drivers },
    include: { _count: { select: { invoices: true } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 })
  }
  await db.transportation.delete({ where: { id } })
  return NextResponse.json({ success: true })
} 