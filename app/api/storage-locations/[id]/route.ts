import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, address, capacity } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      );
    }

    const location = await db.storageLocation.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        capacity: capacity ? Number(capacity) : null,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error("Error updating storage location:", error);
    return NextResponse.json(
      { error: "Failed to update storage location" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if location is being used by any production batches
    const productionBatches = await db.productionBatch.findMany({
      where: { storageLocationId: params.id },
    });

    if (productionBatches.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete location that is being used by production batches",
        },
        { status: 400 }
      );
    }

    await db.storageLocation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "Storage location deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting storage location:", error);
    return NextResponse.json(
      { error: "Failed to delete storage location" },
      { status: 500 }
    );
  }
}
