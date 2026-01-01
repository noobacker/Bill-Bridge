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
    const { productTypeId, quantity, remainingQuantity, productionDate, storageLocationId, notes, materialsUsed, skipRawMaterials } = body

    if (!productTypeId || !quantity || !storageLocationId || !productionDate) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    if (!skipRawMaterials && (!materialsUsed || materialsUsed.length === 0)) {
      return new NextResponse("At least one raw material must be used", { status: 400 })
    }

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (tx) => {
      // Get current business timezone timestamp
      const businessTimestamp = await getServerTimestamp();
      
      // Create the production batch
      const productionBatch = await tx.productionBatch.create({
        data: {
          productTypeId,
          quantity,
          remainingQuantity,
          productionDate: new Date(productionDate), // User can still set this
          storageLocationId,
          notes: notes || null,
          createdAt: businessTimestamp, // This will use business timezone
        },
      })

      // Record the materials used and update inventory (if any)
      if (materialsUsed && materialsUsed.length > 0) {
        for (const material of materialsUsed) {
          // Check if there's enough stock
          const rawMaterial = await tx.rawMaterial.findUnique({
            where: { id: material.materialId },
          })

          if (!rawMaterial) {
            throw new Error(`Raw material with ID ${material.materialId} not found`)
          }

          if (rawMaterial.currentStock < material.quantity) {
            throw new Error(`Insufficient stock for ${rawMaterial.name}`)
          }

          // Record material usage
          await tx.productionMaterial.create({
            data: {
              productionBatchId: productionBatch.id,
              rawMaterialId: material.materialId,
              quantityUsed: material.quantity,
              createdAt: businessTimestamp, // This will use business timezone
            },
          })

          // Update raw material stock
          await tx.rawMaterial.update({
            where: { id: material.materialId },
            data: {
              currentStock: {
                decrement: material.quantity,
              },
            },
          })
        }
      }

      return productionBatch
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[PRODUCTION_POST]", error)
    return new NextResponse(error.message || "Internal Error", { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const productionBatches = await db.productionBatch.findMany({
      orderBy: {
        productionDate: "desc",
      },
      include: {
        productType: true,
        storageLocation: true,
        materials: {
          include: {
            rawMaterial: true,
          },
        },
      },
    })

    return NextResponse.json(productionBatches)
  } catch (error) {
    console.error("[PRODUCTION_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
