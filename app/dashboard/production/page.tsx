import { db } from "@/lib/db"
import { ProductionBatchesTable } from "@/components/production/production-batches-table"
import { Button } from "@/components/ui/button"
import { I18nHeading } from "@/components/i18n/i18n-heading"
import { Plus } from "lucide-react"
import Link from "next/link"

interface ProductionPageProps {
  searchParams: {
    page?: string
    pageSize?: string
    search?: string
  }
}

export default async function ProductionPage({ searchParams }: ProductionPageProps) {
  const page = searchParams.page ? parseInt(searchParams.page) : 1
  const pageSize = searchParams.pageSize ? parseInt(searchParams.pageSize) : 10
  const search = searchParams.search || ""
  
  // Build the where clause for search
  const whereClause = search ? {
    OR: [
      { id: { contains: search, mode: 'insensitive' as const } },
      { storageLocation: { name: { contains: search, mode: 'insensitive' as const } } },
      { productType: { name: { contains: search, mode: 'insensitive' as const } } },
    ],
  } : {}

  // Get total count for pagination
  const totalCount = await db.productionBatch.count({
    where: whereClause,
  })

  // Fetch paginated batches
  const batches = await db.productionBatch.findMany({
    orderBy: {
      productionDate: "desc",
    },
    where: whereClause,
    include: {
      productType: true,
      storageLocation: true,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <I18nHeading as="h1" titleKey="nav.productionInventory" className="text-3xl font-bold" />
        <Link href="/dashboard/production/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            <I18nHeading as="span" titleKey="production.newBatch" />
          </Button>
        </Link>
      </div>

      <ProductionBatchesTable 
        batches={batches} 
        totalItems={totalCount}
        currentPage={page}
        pageSize={pageSize}
      />
    </div>
  )
}
