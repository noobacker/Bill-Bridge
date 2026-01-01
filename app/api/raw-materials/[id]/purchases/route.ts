import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const rawMaterialId = params.id;

    if (!rawMaterialId) {
      return new NextResponse("Raw material ID is required", { status: 400 });
    }

    const purchases = await db.expense.findMany({
      where: {
        rawMaterialId,
      },
      include: {
        partner: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    const payload = purchases.map((purchase) => ({
      id: purchase.id,
      date: purchase.date,
      quantity: purchase.quantity ?? null,
      rate: purchase.rate ?? null,
      amount: purchase.amount,
      vendorName: purchase.partner?.name ?? null,
      billNumber: purchase.billNumber ?? null,
      paymentStatus: purchase.paymentStatus ?? null,
    }));

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[RAW_MATERIAL_PURCHASE_HISTORY]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
