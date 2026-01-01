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

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "5");

    // Get recent transactions
    const transactions = await db.transaction.findMany({
      take: limit,
      orderBy: {
        date: "desc",
      },
      include: {
        partner: true,
        invoice: true,
        purchase: {
          include: {
            rawMaterial: true
          }
        },
        expense: {
          include: {
            category: true
          }
        },
      },
    });

    // Format the transactions for the frontend
    const formattedTransactions = transactions.map((transaction) => {
      let vendor = null;
      let client = null;
      let description = transaction.description;
      let itemDetails = null;

      if (transaction.partner) {
        if (transaction.type === "PURCHASE") {
          vendor = transaction.partner.name;
          if (transaction.purchase?.rawMaterial) {
            itemDetails = `${transaction.purchase.rawMaterial.name} (${transaction.purchase.quantity} ${transaction.purchase.rawMaterial.unit})`;
          }
        } else if (transaction.type === "SALE") {
          client = transaction.partner.name;
        }
      }

      if (transaction.type === "EXPENSE" && transaction.expense?.category) {
        description = `${transaction.expense.category.name}: ${transaction.description}`;
      }

      return {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
        description,
        vendor,
        client,
        itemDetails,
      };
    });

    return NextResponse.json(formattedTransactions);
  } catch (error) {
    console.error("[DASHBOARD_TRANSACTIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 