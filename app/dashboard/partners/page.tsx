import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VendorsSection } from "@/components/partners/vendors-section"
import { ClientsSection } from "@/components/partners/clients-section"
import { TransportationSection } from "@/components/partners/transportation-section"
import { db } from "@/lib/db"
import { I18nHeading } from "@/components/i18n/i18n-heading"

export default async function PartnersPage() {
  let vendors = []
  let clients = []
  let transportation = []

  try {
    vendors = await db.partner.findMany({
      where: {
        OR: [{ type: "VENDOR" }, { type: "BOTH" }],
      },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    })

    clients = await db.partner.findMany({
      where: {
        OR: [{ type: "CLIENT" }, { type: "BOTH" }],
      },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    })

    transportation = await db.transportation.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { invoices: true } },
      },
    })
  } catch (error) {
    console.error("Database fetch failed:", error)
  }

  return (
    <div className="space-y-6">
      <I18nHeading as="h1" titleKey="nav.partners" className="text-3xl font-bold" />

      <Tabs defaultValue="vendors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vendors">
            <I18nHeading as="span" titleKey="partners.vendors" />
          </TabsTrigger>
          <TabsTrigger value="clients">
            <I18nHeading as="span" titleKey="partners.clients" />
          </TabsTrigger>
          <TabsTrigger value="transportation">
            <I18nHeading as="span" titleKey="partners.transportation" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="space-y-4">
          <VendorsSection vendors={vendors} />
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <ClientsSection clients={clients} />
        </TabsContent>

        <TabsContent value="transportation" className="space-y-4">
          <TransportationSection transportation={transportation} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
