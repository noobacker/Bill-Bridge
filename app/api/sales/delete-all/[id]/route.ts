import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Properly destructure params using async pattern
    const { id } = await params;

    // Check if invoice exists
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { sales: true },
    });

    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    // Delete all sales for this invoice
    await db.$transaction(async (tx) => {
      // For each sale, if it has a productionBatchId, restore the quantity to the batch
      for (const sale of invoice.sales) {
        if (sale.productionBatchId) {
          await tx.productionBatch.update({
            where: { id: sale.productionBatchId },
            data: {
              remainingQuantity: {
                increment: sale.quantity,
              },
            },
          });
        }
      }

      // Delete all sales for this invoice
      await tx.sale.deleteMany({
        where: { invoiceId: id },
      });

      // Reset invoice totals to zero so subsequent product adds don't double-count
      await tx.invoice.update({
        where: { id },
        data: {
          subtotal: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          totalAmount: 0,
          pendingAmount: 0,
        },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("[SALES_DELETE_ALL]", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
} 