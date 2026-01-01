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

    // Get all product types
    const allProductTypes = await db.productType.findMany({
      orderBy: {
        name: 'asc',
      }
    });
    
    // Filter out services and map to the required format
    const productTypes = allProductTypes
      .filter((pt: any) => !pt.isService)
      .map(pt => ({
        id: pt.id,
        name: pt.name
      }));

    return NextResponse.json(productTypes);
  } catch (error) {
    console.error("[DASHBOARD_PRODUCTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 