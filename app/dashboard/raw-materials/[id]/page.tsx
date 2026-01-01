import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { EditRawMaterialForm } from "@/components/raw-materials/edit-raw-material-form"

interface EditRawMaterialPageProps {
  params: {
    id: string
  }
}

export default async function EditRawMaterialPage({ params }: EditRawMaterialPageProps) {
  const rawMaterial = await db.rawMaterial.findUnique({
    where: {
      id: params.id,
    },
  })

  if (!rawMaterial) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Edit Raw Material</h1>
      <EditRawMaterialForm rawMaterial={rawMaterial} />
    </div>
  )
}
