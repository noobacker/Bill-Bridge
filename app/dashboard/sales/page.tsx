import { db } from "@/lib/db"
import { SalesTable } from "@/components/sales/sales-table"
import { CreateSaleDialog } from "@/components/sales/create-sale-dialog"
import { Partner, ProductionBatch, ProductType, Sale } from "@/components/sales/types"
import { Prisma } from "@prisma/client"
import SalesClientControls from "@/components/sales/sales-client-controls"
import { redirect } from "next/navigation"
import { I18nHeading } from "@/components/i18n/i18n-heading"

// Helper function to convert database results to component-compatible types
function mapProductionBatches(dbBatches: any[]): ProductionBatch[] {
  return dbBatches.map(batch => ({
    id: batch.id,
    remainingQuantity: batch.remainingQuantity,
    productType: {
      id: batch.productType.id,
      name: batch.productType.name,
    },
    storageLocation: batch.storageLocation ? {
      id: batch.storageLocation.id,
      name: batch.storageLocation.name,
      createdAt: batch.storageLocation.createdAt,
      updatedAt: batch.storageLocation.updatedAt,
      description: batch.storageLocation.description,
    } : null,
  }));
}

// Helper function to convert partners
function mapPartners(dbPartners: any[]): Partner[] {
  return dbPartners.map(partner => ({
    id: partner.id,
    name: partner.name,
  }));
}

// Helper function to convert product types
function mapProductTypes(dbProductTypes: any[]): ProductType[] {
  return dbProductTypes.map(type => ({
    id: type.id,
    name: type.name,
    hsnNumber: type.hsnNumber,
    isService: type.isService,
    cgstRate: type.cgstRate,
    sgstRate: type.sgstRate,
    igstRate: type.igstRate || 0,
  }));
}

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams;
  const from = params?.from;
  const to = params?.to;

  // Parse date range
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;

  // Build invoice date filter
  let invoiceDateFilter: any = {};
  if (fromDate && toDate) {
    const toDatePlusOne = new Date(toDate);
    toDatePlusOne.setDate(toDatePlusOne.getDate() + 1);
    invoiceDateFilter = {
      gte: fromDate,
      lt: toDatePlusOne,
    };
  } else if (fromDate) {
    invoiceDateFilter = { gte: fromDate };
  } else if (toDate) {
    const toDatePlusOne = new Date(toDate);
    toDatePlusOne.setDate(toDatePlusOne.getDate() + 1);
    invoiceDateFilter = { lt: toDatePlusOne };
  }

  // Get all invoices in the date range
  const dbInvoices = await db.invoice.findMany({
    where: {
      ...(fromDate || toDate ? { invoiceDate: invoiceDateFilter } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      partner: true,
      sales: {
        include: {
          productType: true,
          productionBatch: {
            include: {
              storageLocation: true,
            }
          },
        }
      },
    },
  })

  // Transform invoices into consolidated sales format
  const sales: Sale[] = []
  
  for (const invoice of dbInvoices) {
    if (invoice.sales.length === 0) continue;
    
    // Group sales by product type
    const salesByProductType = new Map();
    
    for (const sale of invoice.sales) {
      const key = sale.productTypeId;
      if (!salesByProductType.has(key)) {
        salesByProductType.set(key, {
          productType: sale.productType,
          quantity: 0,
          amount: 0,
          batches: []
        });
      }
      
      const group = salesByProductType.get(key);
      group.quantity += sale.quantity;
      group.amount += sale.amount;
      group.batches.push({
        id: sale.productionBatchId,
        quantity: sale.quantity,
        location: sale.productionBatch?.storageLocation?.name || "Unknown"
      });
    }
    
    // Create consolidated sales entries
    for (const [productTypeId, group] of salesByProductType.entries()) {
      const firstSale = invoice.sales.find(s => s.productTypeId === productTypeId);
      if (!firstSale) continue;
      
      sales.push({
        id: firstSale.id, // Use the first sale's ID as reference
        quantity: group.quantity,
        rate: firstSale.rate,
        amount: group.amount,
        createdAt: invoice.createdAt,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          isGst: invoice.isGst,
          paymentType: invoice.paymentType,
          totalAmount: invoice.totalAmount,
          invoiceDate: invoice.invoiceDate,
          createdAt: invoice.createdAt,
          partner: {
            name: invoice.partner.name,
            phone: invoice.partner.phone,
            contactName: invoice.partner.contactName,
            email: invoice.partner.email,
            gstNumber: invoice.partner.gstNumber,
            id: invoice.partner.id,
          },
        },
        productType: {
          name: group.productType.name,
          hsnNumber: group.productType.hsnNumber,
        },
        // Store batch information for display
        batchDetails: group.batches,
      })
    }
  }

  const dbPartners = await db.partner.findMany({
    where: {
      OR: [{ type: "CLIENT" }, { type: "BOTH" }],
    },
    orderBy: { name: "asc" },
  })

  const dbProductTypes = await db.productType.findMany({
    orderBy: { name: "asc" },
  })

  const dbProductionBatches = await db.productionBatch.findMany({
    where: {
      remainingQuantity: {
        gt: 0,
      },
    },
    orderBy: { productionDate: "desc" },
    include: {
      productType: true,
      storageLocation: true,
    },
  })
  
  // Convert to component-compatible format
  const productionBatches = mapProductionBatches(dbProductionBatches);
  const partners = mapPartners(dbPartners);
  const productTypes = mapProductTypes(dbProductTypes);

  // Get the last invoice number
  const lastInvoice = await db.invoice.findFirst({
    orderBy: {
      invoiceNumber: "desc",
    },
  })

  const lastInvoiceNumber = lastInvoice?.invoiceNumber || "INV-0000"

  // Get system settings for GST rates
  const settings = await db.systemSettings.findFirst()
  const cgstRate = settings?.cgstRate || 9
  const sgstRate = settings?.sgstRate || 9
  const igstRate = settings?.igstRate || 0
  const defaultBrickPrice = settings?.defaultBrickPrice || 7

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex items-center gap-4">
          <I18nHeading as="h1" titleKey="nav.sales" className="text-3xl font-bold" />
        </div>
        <div className="flex items-center gap-2">
          <SalesClientControls />
          <CreateSaleDialog
            partners={partners}
            productTypes={productTypes}
            productionBatches={productionBatches}
            lastInvoiceNumber={lastInvoiceNumber}
            cgstRate={cgstRate}
            sgstRate={sgstRate}
            igstRate={igstRate}
            defaultBrickPrice={defaultBrickPrice}
          />
        </div>
      </div>
      <SalesTable 
        sales={sales}
        partners={partners}
        productTypes={productTypes}
        productionBatches={productionBatches}
        cgstRate={cgstRate}
        sgstRate={sgstRate}
        igstRate={igstRate}
      />
    </div>
  )
}
