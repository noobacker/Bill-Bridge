import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(
  req: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { name, unit, currentStock, minStockLevel, vendorId } = body

    if (!name || !unit) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Fix for Next.js warning about params.id
    const materialId = String(params?.id)

    // Update the raw material
    const rawMaterial = await db.rawMaterial.update({
      where: {
        id: materialId,
      },
      data: {
        name,
        unit,
        currentStock: Number.parseFloat(currentStock.toString()) || 0,
        minStockLevel: Number.parseFloat(minStockLevel.toString()) || 0,
      },
    })

    // If a vendor ID is provided, update or create an expense record
    if (vendorId) {
      // Get the Raw Material expense category
      const expenseCategory = await db.expenseCategory.findFirst({ 
        where: { name: "Raw Material" } 
      })

      if (!expenseCategory) {
        return NextResponse.json(rawMaterial)
      }

      // Find the most recent purchase for this material
      const latestPurchase = await db.expense.findFirst({
        where: {
          rawMaterialId: materialId,
          category: {
            name: "Raw Material"
          }
        },
        orderBy: {
          date: 'desc'
        }
      })

      if (latestPurchase) {
        // Update the partner ID on the expense record
        await db.expense.update({
          where: { id: latestPurchase.id },
          data: {
            partnerId: vendorId
          }
        })

        // Update any related transactions
        await db.transaction.updateMany({
          where: { expenseId: latestPurchase.id },
          data: {
            partnerId: vendorId
          }
        })
      } else {
        // Create a new expense record if none exists
        const newExpense = await db.expense.create({
          data: {
            categoryId: expenseCategory.id,
            partnerId: vendorId,
            rawMaterialId: materialId,
            quantity: 0,
            rate: 0,
            amount: 0,
            date: new Date(),
            paymentStatus: "COMPLETE",
            paidAmount: 0,
            pendingAmount: 0,
            description: `Vendor assignment for ${name}`,
          }
        })

        // Create a transaction record for tracking
        await db.transaction.create({
          data: {
            type: "EXPENSE",
            amount: 0,
            date: new Date(),
            description: `Vendor assignment for ${name}`,
            expenseId: newExpense.id,
            partnerId: vendorId
          }
        })
      }
    }

    // Return the updated material with vendor information
    const updatedMaterial = await db.rawMaterial.findUnique({
      where: { id: materialId },
      include: {
        purchases: {
          orderBy: { date: 'desc' },
          take: 1,
          include: {
            partner: true
          }
        }
      }
    })

    // Format the response to include vendor information
    const formattedResponse = {
      ...updatedMaterial,
      vendorId: updatedMaterial?.purchases[0]?.partnerId || (vendorId || null),
      vendorName: updatedMaterial?.purchases[0]?.partner?.name || null
    }

    return NextResponse.json(formattedResponse)
  } catch (error) {
    console.error("[RAW_MATERIAL_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function GET(
  req: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Fix for Next.js warning about params.id
    const materialId = String(params?.id)

    const rawMaterial = await db.rawMaterial.findUnique({
      where: {
        id: materialId,
      },
      include: {
        purchases: {
          orderBy: { date: 'desc' },
          take: 1,
          include: {
            partner: true
          }
        }
      }
    })

    if (!rawMaterial) {
      return new NextResponse("Raw material not found", { status: 404 })
    }

    // Format the response to include vendor information
    const formattedResponse = {
      ...rawMaterial,
      vendorId: rawMaterial.purchases[0]?.partnerId || null,
      vendorName: rawMaterial.purchases[0]?.partner?.name || null
    }

    return NextResponse.json(formattedResponse)
  } catch (error) {
    console.error("[RAW_MATERIAL_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(
  req: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Fix for Next.js warning about params.id
    const materialId = String(params?.id)

    // Delete related ProductionMaterial records
    await db.productionMaterial.deleteMany({
      where: { rawMaterialId: materialId },
    })

    // Delete related expenses
    await db.expense.deleteMany({
      where: { rawMaterialId: materialId },
    })

    // Now delete the raw material
    await db.rawMaterial.delete({
      where: { id: materialId },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[RAW_MATERIAL_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
