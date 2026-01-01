import { db } from "@/lib/db"
import { VendorsTable } from "@/components/vendors/vendors-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function VendorsPage() {
  const vendors = await db.vendor.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      _count: {
        select: {
          purchases: true,
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Vendors</h1>
        <Link href="/dashboard/vendors/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        </Link>
      </div>

      <VendorsTable vendors={vendors} />
    </div>
  )
}
