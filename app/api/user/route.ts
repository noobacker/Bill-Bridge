import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";

const ALL_SECTIONS = [
  "dashboard",
  "raw-materials",
  "production",
  "inventory",
  "sales",
  "expenses",
  "reports",
  "partners",
  "settings",
];

// List all users (admin only)
export async function GET() {
  const session: any = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const users = await db.user.findMany({
    select: { id: true, name: true, username: true, role: true, allowedSections: true, createdAt: true, updatedAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

// Add a new user (admin only)
export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { name, username, password, role, allowedSections } = await req.json();
  if (!name || !username || !password || !role) {
    return new NextResponse("Missing required fields", { status: 400 });
  }
  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    return new NextResponse("Username already exists", { status: 409 });
  }
  const hashed = await hash(password, 10);

  // For supervisors, if no explicit allowedSections provided, default to all
  const sections: string[] =
    role === "SUPERVISOR"
      ? (Array.isArray(allowedSections) && allowedSections.length > 0
          ? allowedSections
          : ALL_SECTIONS)
      : ALL_SECTIONS;
  const user = await db.user.create({
    data: { name, username, password: hashed, role, allowedSections: sections },
    select: { id: true, name: true, username: true, role: true, allowedSections: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json(user);
}

// Edit a user (admin only)
export async function PATCH(req: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { id, name, username, password, role, allowedSections } = await req.json();
  if (!id) {
    return new NextResponse("User ID required", { status: 400 });
  }
  const updateData: any = {};
  if (name) updateData.name = name;
  if (username) updateData.username = username;
  if (role) updateData.role = role;
  if (password) updateData.password = await hash(password, 10);

  if (role === "SUPERVISOR") {
    if (Array.isArray(allowedSections) && allowedSections.length > 0) {
      updateData.allowedSections = allowedSections;
    } else if (!Array.isArray(allowedSections)) {
      // If not provided, keep existing allowedSections as-is
    } else if (allowedSections.length === 0) {
      // Empty array means all sections
      updateData.allowedSections = ALL_SECTIONS;
    }
  } else if (role === "ADMIN") {
    // Admins always see everything
    updateData.allowedSections = ALL_SECTIONS;
  }
  const user = await db.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, username: true, role: true, allowedSections: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json(user);
}

// Delete a user (admin only)
export async function DELETE(req: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { id } = await req.json();
  if (!id) {
    return new NextResponse("User ID required", { status: 400 });
  }
  await db.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
} 