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

    // Fetch invoices within the date range
    const invoices = await db.invoice.findMany({
      where: {
        invoiceDate: {
          gte: startDateUTC,
          lte: endDateUTC,
        },
      },
      include: {
        sales: {
          include: {
            productType: true,
          },
        },
      },
      orderBy: {
        invoiceDate: "asc",
      },
    });

    // Generate an array of days in the interval (in IST)
    const days = eachDayOfInterval({
      start: startDate,
      end: today,
    });

    // Process sales data by day
    const salesData = days.map((day) => {
      // Convert day to IST for comparison
      const currentDayStart = startOfDay(utcToZonedTime(day, timeZone));
      const currentDayEnd = endOfDay(utcToZonedTime(day, timeZone));
      
      // Convert IST day boundaries to UTC for comparison with database records
      const dayStartUTC = zonedTimeToUtc(currentDayStart, timeZone);
      const dayEndUTC = zonedTimeToUtc(currentDayEnd, timeZone);

      // Filter invoices for the current day
      const dayInvoices = invoices.filter((invoice) => {
        const invoiceDate = new Date(invoice.invoiceDate);
        return invoiceDate >= dayStartUTC && invoiceDate <= dayEndUTC;
      });

      // Calculate totals for the day
      let totalAmount = 0;
      let totalQuantity = 0;

      dayInvoices.forEach((invoice) => {
        invoice.sales.forEach((sale) => {
          // If filtering by product type, only count matching sales
          if (!productTypeId || sale.productTypeId === productTypeId) {
            totalAmount += sale.amount;
            totalQuantity += sale.quantity;
          }
        });
      });

      // Format the date in IST
      const formattedDate = format(currentDayStart, 'yyyy-MM-dd');

      return {
        date: formattedDate,
        totalAmount,
        totalQuantity,
      };
    });

    return NextResponse.json(salesData);
  } catch (error) {
    console.error("[DASHBOARD_SALES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
