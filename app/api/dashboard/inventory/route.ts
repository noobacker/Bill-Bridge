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
    const allProductTypes = await db.productType.findMany();
    
    // Filter out services using type assertion
    const productTypes = allProductTypes.filter(pt => !(pt as any).isService);

    // Get inventory data for each product type
    const inventoryData = await Promise.all(
      productTypes.map(async (productType) => {
        const totalStock = await db.productionBatch.aggregate({
          _sum: {
            remainingQuantity: true,
          },
          where: {
            productTypeId: productType.id,
          },
        });

        return {
          id: productType.id,
          name: productType.name,
          stock: totalStock._sum.remainingQuantity || 0,
        };
      })
    );

    return NextResponse.json(inventoryData);
  } catch (error) {
    console.error("[DASHBOARD_INVENTORY_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 