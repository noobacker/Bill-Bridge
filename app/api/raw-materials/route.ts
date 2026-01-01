import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
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
    const { name, unit, currentStock, minStockLevel, purchaseAmount, partnerId, quantity, materialId, mode, inventoryDate, billNumber } = body

    // Get the Raw Material expense category - create it if it doesn't exist
    let expenseCategory = await db.expenseCategory.findFirst({ where: { name: "Raw Material" } })
    if (!expenseCategory) {
      expenseCategory = await db.expenseCategory.create({
        data: {
          name: "Raw Material",
          isDefault: true,
        },
      })
    }

    // Format the date correctly
    const businessTimestamp = await getServerTimestamp();
const purchaseDate = inventoryDate ? new Date(inventoryDate) : businessTimestamp;

    if (mode === 'existing' && materialId) {
      // Add to existing inventory
      const existing = await db.rawMaterial.findUnique({ where: { id: materialId } })
      if (!existing) {
        return new NextResponse("Raw material not found", { status: 404 })
      }
      
      // Start a transaction to ensure data consistency
      const result = await db.$transaction(async (tx) => {
        // Update stock
        const updatedMaterial = await tx.rawMaterial.update({
          where: { id: materialId },
          data: {
            currentStock: existing.currentStock + (Number.parseFloat(quantity) || 0),
          },
        })

        // Create expense for the purchase
        if (purchaseAmount && expenseCategory) {
          const expenseData: any = {
            category: { connect: { id: expenseCategory.id } },
            rawMaterial: { connect: { id: materialId } },
            quantity: Number.parseFloat(quantity) || 0,
            rate: purchaseAmount && quantity ? Number.parseFloat(purchaseAmount) / Number.parseFloat(quantity) : 0,
            amount: Number.parseFloat(purchaseAmount) || 0,
            date: purchaseDate,
            paymentStatus: "COMPLETE",
            paidAmount: Number.parseFloat(purchaseAmount) || 0,
            pendingAmount: 0,
            description: `Purchase of ${existing.name} (${quantity} ${existing.unit})`,
          }
          
          if (partnerId) {
            expenseData.partner = { connect: { id: partnerId } }
          }
          if (billNumber) {
            expenseData.billNumber = billNumber
          }
          
          const newExpense = await tx.expense.create({ 
            data: {
              ...expenseData,
              createdAt: businessTimestamp,
            }
          })

          // Also create a transaction for this expense
          const transactionData: any = {
            type: "EXPENSE",
            amount: newExpense.amount,
            date: newExpense.date,
            description: `Purchase of ${existing.name} (${quantity} ${existing.unit})`,
            expense: { connect: { id: newExpense.id } },
            createdAt: businessTimestamp,
          }
          
          if (partnerId) {
            transactionData.partner = { connect: { id: partnerId } }
          }
          
          await tx.transaction.create({ data: transactionData });
        }

        return updatedMaterial
      })

      return NextResponse.json(result)
    }

    // Default: create new raw material
    if (!name || !unit) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Create the raw material
      const rawMaterial = await tx.rawMaterial.create({
        data: {
          name,
          unit,
          currentStock: Number.parseFloat(quantity) || 0,
          minStockLevel: Number.parseFloat(minStockLevel) || 0,
          createdAt: businessTimestamp,
        },
      })
      
      // Create expense for the new material if there's a purchase amount
      if (purchaseAmount && partnerId && expenseCategory) {
        const parsedQuantity = Number.parseFloat(quantity) || 0
        const parsedAmount = Number.parseFloat(purchaseAmount) || 0
        
        const expenseData: any = {
          category: { connect: { id: expenseCategory.id } },
          partner: { connect: { id: partnerId } },
          rawMaterial: { connect: { id: rawMaterial.id } },
          quantity: parsedQuantity,
          rate: parsedQuantity > 0 ? parsedAmount / parsedQuantity : 0,
          amount: parsedAmount,
          date: purchaseDate,
          paymentStatus: "COMPLETE",
          paidAmount: parsedAmount,
          pendingAmount: 0,
          description: `Purchase of ${name} (${parsedQuantity} ${unit})`,
        }
        if (billNumber) {
          expenseData.billNumber = billNumber
        }
        
        const newExpense = await tx.expense.create({ 
          data: {
            ...expenseData,
            createdAt: businessTimestamp,
          }
        })
        
        // Also create a transaction for this expense
        await tx.transaction.create({
          data: {
            type: "EXPENSE",
            amount: newExpense.amount,
            date: newExpense.date,
            description: `Purchase of ${name} (${parsedQuantity} ${unit})`,
            expense: { connect: { id: newExpense.id } },
            partner: { connect: { id: partnerId } },
            createdAt: businessTimestamp,
          }
        })
      }

      return rawMaterial
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[RAW_MATERIALS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const rawMaterials = await db.rawMaterial.findMany({
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(rawMaterials)
  } catch (error) {
    console.error("[RAW_MATERIALS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
