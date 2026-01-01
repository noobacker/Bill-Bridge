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

    // Get all storage locations
    const locations = await db.storageLocation.findMany();

    // Get stock data for each location
    const stockByLocation = await Promise.all(
      locations.map(async (location) => {
        const totalStock = await db.productionBatch.aggregate({
          _sum: {
            remainingQuantity: true,
          },
          where: {
            storageLocationId: location.id,
          },
        });

        return {
          name: location.name,
          value: totalStock._sum.remainingQuantity || 0,
        };
      })
    );

    // Filter out locations with zero stock
    const filteredStockData = stockByLocation.filter(item => item.value > 0);

    // Sort by location name for consistency
    filteredStockData.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(filteredStockData);
  } catch (error) {
    console.error("[DASHBOARD_STOCK_BY_LOCATION_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 