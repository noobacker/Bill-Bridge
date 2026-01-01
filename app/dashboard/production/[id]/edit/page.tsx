import { db } from "@/lib/db"
import { EditProductionForm } from "./_components/edit-production-form"

export default async function EditProductionBatchPage({ params }: { params: { id: string } }) {
  const batch = await db.productionBatch.findUnique({
    where: { id: params.id },
    include: {
      productType: true,
      storageLocation: true,
    },
  })

  const storageLocations = await db.storageLocation.findMany({
    orderBy: { name: "asc" },
  })

  if (!batch) {
    return <div>Production batch not found.</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Edit Production Batch</h1>
      <EditProductionForm batch={batch} storageLocations={storageLocations} />
    </div>
  )
} 