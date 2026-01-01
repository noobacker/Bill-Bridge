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

    // Check if production batch is in use
    const inUse = await db.sale.findFirst({
      where: {
        productionBatchId: params.id,
      },
    })

    if (inUse) {
      return new NextResponse("Cannot delete production batch that has sales", { status: 400 })
    }

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Get the materials used in this batch
      const materials = await tx.productionMaterial.findMany({
        where: {
          productionBatchId: params.id,
        },
      })

      // Return materials to inventory
      for (const material of materials) {
        await tx.rawMaterial.update({
          where: { id: material.rawMaterialId },
          data: {
            currentStock: {
              increment: material.quantityUsed,
            },
          },
        })
      }

      // Delete production materials
      await tx.productionMaterial.deleteMany({
        where: {
          productionBatchId: params.id,
        },
      })

      // Delete the production batch
      const productionBatch = await tx.productionBatch.delete({
        where: {
          id: params.id,
        },
      })

      return productionBatch
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[PRODUCTION_DELETE]", error)
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
    const { productionDate, storageLocationId, remainingQuantity, notes } = body

    // Get the current production batch
    const currentBatch = await db.productionBatch.findUnique({
      where: {
        id: params.id,
      },
    })

    if (!currentBatch) {
      return new NextResponse("Production batch not found", { status: 404 })
    }

    // Validate remaining quantity
    if (remainingQuantity > currentBatch.quantity) {
      return new NextResponse("Remaining quantity cannot exceed total quantity", { status: 400 })
    }

    const productionBatch = await db.productionBatch.update({
      where: {
        id: params.id,
      },
      data: {
        productionDate: productionDate ? new Date(productionDate) : undefined,
        storageLocationId,
        remainingQuantity,
        notes: notes || null,
      },
    })

    return NextResponse.json(productionBatch)
  } catch (error) {
    console.error("[PRODUCTION_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
