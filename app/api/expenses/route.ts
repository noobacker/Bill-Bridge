import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getServerTimestamp } from "@/lib/server-timestamp"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { categoryId, description, amount, date, partnerId, rawMaterialId } = body

    if (!categoryId || !amount || !date) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Get the category to check if it's "Raw Material"
    const category = await db.expenseCategory.findUnique({
      where: { id: categoryId },
    })

    if (!category) {
      return new NextResponse("Category not found", { status: 404 })
    }

    // If it's a raw material expense, validate vendor and material
    if (category.name === "Raw Material" && (!partnerId || !rawMaterialId)) {
      return new NextResponse("Vendor and raw material are required for raw material expenses", { status: 400 })
    }

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Get current business timezone timestamp
      const businessTimestamp = await getServerTimestamp();
      
      // Create the expense (unified model, optionally linked to partner/raw material)
      const expense = await tx.expense.create({
        data: {
          categoryId,
          description: description || null,
          amount,
          date: new Date(date), // User can still set the expense date
          partnerId: partnerId || null,
          rawMaterialId: rawMaterialId || null,
          createdAt: businessTimestamp, // This will use business timezone
        },
      })

      // Create a financial transaction record
      await tx.transaction.create({
        data: {
          type: "EXPENSE",
          amount,
          date: new Date(date), // User can still set the transaction date
          description: `${category.name} Expense${description ? `: ${description}` : ""}`,
          partnerId: partnerId || null,
          expenseId: expense.id,
          createdAt: businessTimestamp, // This will use business timezone
        },
      })

      return expense
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[EXPENSES_POST]", error)
    return new NextResponse(error.message || "Internal Error", { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const expenses = await db.expense.findMany({
      orderBy: {
        date: "desc",
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error("[EXPENSES_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
