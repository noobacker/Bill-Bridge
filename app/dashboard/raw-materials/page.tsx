import { db } from "@/lib/db"
import { RawMaterialsTable } from "@/components/raw-materials/raw-materials-table"
import { Button } from "@/components/ui/button"
import { I18nHeading } from "@/components/i18n/i18n-heading"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function RawMaterialsPage() {
  const rawMaterials = await db.rawMaterial.findMany({
    orderBy: {
      name: "asc",
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <I18nHeading as="h1" titleKey="nav.rawMaterials" className="text-3xl font-bold" />
        <Link href="/dashboard/raw-materials/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            <I18nHeading as="span" titleKey="rawMaterials.addMaterial" />
          </Button>
        </Link>
      </div>

      <RawMaterialsTable rawMaterials={rawMaterials} />
    </div>
  )
}
