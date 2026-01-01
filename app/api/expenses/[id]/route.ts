import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Delete associated transactions
      await tx.transaction.deleteMany({
        where: {
          expenseId: params.id,
        },
      })

      // Delete the expense
      const expense = await tx.expense.delete({
        where: {
          id: params.id,
        },
      })

      return expense
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[EXPENSE_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { categoryId, description, amount, date } = body

    if (!categoryId || !amount || !date) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Get the expense category
      const category = await tx.expenseCategory.findUnique({
        where: { id: categoryId },
      })

      if (!category) {
        throw new Error("Category not found")
      }

      // Update the expense
      const expense = await tx.expense.update({
        where: {
          id: params.id,
        },
        data: {
          categoryId,
          description: description || null,
          amount,
          date: new Date(date),
        },
      })

      // Update associated transactions
      await tx.transaction.updateMany({
        where: {
          expenseId: params.id,
        },
        data: {
          amount,
          date: new Date(date),
          description: `${category.name} Expense${description ? `: ${description}` : ""}`,
        },
      })

      return expense
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[EXPENSE_PATCH]", error)
    return new NextResponse(error.message || "Internal Error", { status: 500 })
  }
}
