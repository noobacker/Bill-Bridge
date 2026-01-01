import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { promises as fs } from "fs"
import path from "path"

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session as any)?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 })
  }
  const formData = await req.formData()
  const file = formData.get("logo") as File | null
  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 })
  }
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const logoPath = path.join(process.cwd(), "public/images/logo.png")
  await fs.writeFile(logoPath, buffer)
  // Update DB
  const settings = await db.systemSettings.findFirst()
  if (settings) {
    await db.systemSettings.update({
      where: { id: settings.id },
      data: { logoUrl: "/images/logo.png" },
    })
  }
  return NextResponse.json({ logoUrl: "/images/logo.png" })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session || (session as any)?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 })
  }
  const logoPath = path.join(process.cwd(), "public/images/logo.png")
  try {
    await fs.unlink(logoPath)
  } catch {}
  // Update DB
  const settings = await db.systemSettings.findFirst()
  if (settings) {
    await db.systemSettings.update({
      where: { id: settings.id },
      data: { logoUrl: "/images/default_logo.png" },
    })
  }
  return NextResponse.json({ logoUrl: "/images/default_logo.png" })
} 