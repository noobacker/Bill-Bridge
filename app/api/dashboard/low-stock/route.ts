import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all raw materials
    const rawMaterials = await db.rawMaterial.findMany();
    
    // Filter to find materials with stock below minimum level
    const lowStockItems = rawMaterials.filter(
      (material) => material.currentStock < material.minStockLevel
    );
    
    // Format the data for the frontend
    const formattedData = lowStockItems.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      currentStock: item.currentStock,
      minStockLevel: item.minStockLevel,
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("[DASHBOARD_LOW_STOCK_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 