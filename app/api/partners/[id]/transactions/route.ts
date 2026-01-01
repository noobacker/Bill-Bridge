import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: partnerId } = await params;

    // Get the partner with their invoices and purchases
    const partner = await db.partner.findUnique({
      where: { id: partnerId },
      include: {
        invoices: {
          orderBy: { createdAt: "desc" },
          include: {
            sales: {
              include: {
                productType: true,
              },
            },
          },
        },
        purchases: {
          orderBy: { date: "desc" },
          include: {
            rawMaterial: true,
          },
        },
      },
    });

    if (!partner) {
      return new NextResponse("Partner not found", { status: 404 });
    }

    // Format the transactions from invoices (sales to client)
    const invoiceTransactions = partner.invoices.map((invoice) => {
      // Calculate the total quantity across all sales
      const totalQuantity = invoice.sales.reduce(
        (sum, sale) => sum + sale.quantity,
        0
      );

      // Get unique product types
      const productTypes = [
        ...new Set(invoice.sales.map((sale) => sale.productType.name)),
      ];

      return {
        id: invoice.id,
        date: invoice.createdAt,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount,
        products: productTypes.join(", "),
        quantity: totalQuantity,
        paymentStatus: invoice.paymentStatus, // Use the actual enum value
        pendingAmount: invoice.pendingAmount,
      };
    });

    // Format the transactions from purchases (expenses to vendor)
    const purchaseTransactions = (partner.purchases || []).map((purchase) => {
      return {
        id: purchase.id,
        date: purchase.date,
        invoiceNumber: purchase.billNumber && purchase.billNumber.trim() !== "" ? purchase.billNumber : "-",
        amount: purchase.amount,
        products: purchase.rawMaterial ? purchase.rawMaterial.name : "",
        quantity: purchase.quantity ?? 0,
        paymentStatus: purchase.paymentStatus ?? "PENDING",
        pendingAmount: purchase.pendingAmount ?? 0,
      };
    });

    const transactions = [...invoiceTransactions, ...purchaseTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error("[PARTNER_TRANSACTIONS_GET]", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
