import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  // List all transportation entries
  const transportation = await db.transportation.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { invoices: true } } },
  })
  return NextResponse.json(transportation)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 })
  }
  const { name, ownerName, phone, drivers, city } = await req.json()
  if (!name || !city) {
    return new NextResponse("Missing required fields", { status: 400 })
  }
  const transportation = await db.transportation.create({
    data: { name, ownerName, phone, drivers, city },
  })
  // Add _count for UI consistency
  return NextResponse.json({ ...transportation, _count: { invoices: 0 } })
} 