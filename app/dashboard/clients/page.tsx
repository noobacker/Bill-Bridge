import { db } from "@/lib/db"
import { ClientsTable } from "@/components/clients/clients-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function ClientsPage() {
  const clients = await db.client.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      _count: {
        select: {
          invoices: true,
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Link href="/dashboard/clients/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </div>

      <ClientsTable clients={clients} />
    </div>
  )
}
