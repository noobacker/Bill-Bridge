import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { eachDayOfInterval, subDays, startOfDay, endOfDay, format } from "date-fns";
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get query parameters
    const url = new URL(req.url);
    const viewType = url.searchParams.get("view") || "weekly";
    const productTypeId = url.searchParams.get("productTypeId");

    // Define the timezone for India (IST)
    const timeZone = 'Asia/Kolkata';
    
    // Get current date in IST
    const today = utcToZonedTime(new Date(), timeZone);
    
    // Calculate the start date based on view type (in IST)
    const daysToSubtract = viewType === "monthly" ? 30 : 7;
    const startDate = startOfDay(subDays(today, daysToSubtract));
    
    // Convert IST dates to UTC for database query
    const startDateUTC = zonedTimeToUtc(startDate, timeZone);
    const endDateUTC = zonedTimeToUtc(endOfDay(today), timeZone);

    // Fetch production batches within the date range
    const batches = await db.productionBatch.findMany({
      where: {
        createdAt: {
          gte: startDateUTC,
          lte: endDateUTC,
        },
        ...(productTypeId ? { productTypeId } : {}),
      },
      include: {
        materials: {
          include: {
            rawMaterial: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Generate an array of days in the interval (in IST)
    const days = eachDayOfInterval({
      start: startDate,
      end: today,
    });

    // Process production data by day
    const productionData = days.map((day) => {
      // Convert day to IST for comparison
      const currentDayStart = startOfDay(utcToZonedTime(day, timeZone));
      const currentDayEnd = endOfDay(utcToZonedTime(day, timeZone));
      
      // Convert IST day boundaries to UTC for comparison with database records
      const dayStartUTC = zonedTimeToUtc(currentDayStart, timeZone);
      const dayEndUTC = zonedTimeToUtc(currentDayEnd, timeZone);

      // Filter batches for the current day
      const dayBatches = batches.filter((batch) => {
        const batchDate = new Date(batch.createdAt);
        return batchDate >= dayStartUTC && batchDate <= dayEndUTC;
      });

      // Calculate total production for the day
      const totalProduction = dayBatches.reduce((sum, batch) => sum + batch.quantity, 0);

      // Aggregate raw material usage
      const materialsMap = new Map();
      dayBatches.forEach((batch) => {
        batch.materials.forEach((material) => {
          const key = material.rawMaterial.id;
          if (!materialsMap.has(key)) {
            materialsMap.set(key, {
              name: material.rawMaterial.name,
              quantity: 0,
              unit: material.rawMaterial.unit,
            });
          }
          materialsMap.get(key).quantity += material.quantityUsed;
        });
      });

      // Format the date in IST
      const formattedDate = format(currentDayStart, 'yyyy-MM-dd');

      return {
        date: formattedDate,
        totalProduction,
        materials: Array.from(materialsMap.values()),
      };
    });

    return NextResponse.json(productionData);
  } catch (error) {
    console.error("[DASHBOARD_PRODUCTION_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 