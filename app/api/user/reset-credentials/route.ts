import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { compare, hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { currentPassword, newUsername, newPassword } = await req.json();
    if (!currentPassword || (!newUsername && !newPassword)) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const passwordValid = await compare(currentPassword, user.password);
    if (!passwordValid) {
      return new NextResponse("Current password is incorrect", { status: 403 });
    }

    // Check username uniqueness if changing username
    if (newUsername && newUsername !== user.username) {
      const existing = await db.user.findUnique({ where: { username: newUsername } });
      if (existing) {
        return new NextResponse("Username already taken", { status: 409 });
      }
    }

    let updateData: any = {};
    if (newUsername && newUsername !== user.username) {
      updateData.username = newUsername;
    }
    if (newPassword) {
      updateData.password = await hash(newPassword, 10);
    }
    if (Object.keys(updateData).length === 0) {
      return new NextResponse("No changes provided", { status: 400 });
    }

    await db.user.update({ where: { id: user.id }, data: updateData });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[USER_RESET_CREDENTIALS]", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
} 