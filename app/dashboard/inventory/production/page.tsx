import { ProductionSection } from "@/components/inventory/production-section";
import { db } from "@/lib/db";

// Define types to match component expectations
interface ProcessedRawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  vendorName?: string;
  lastInventoryDate?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProcessedProductionBatch {
  id: string;
  quantity: number;
  remainingQuantity: number;
  productionDate: Date;
  createdAt: Date;
  productType: {
    id: string;
    name: string;
    hsnNumber: string;
  };
  storageLocation: {
    id: string;
    name: string;
  };
}

export default async function ProductionPage() {
  // Fetch all necessary data
  const rawMaterials = await db.rawMaterial.findMany({
    orderBy: { name: "asc" },
    include: {
      purchases: {
        orderBy: { date: "desc" },
        take: 1,
        include: {
          partner: true,
        },
      },
    },
  });

  // Process raw materials to include vendor and last inventory date
  const processedRawMaterials: ProcessedRawMaterial[] = rawMaterials.map(
    (material) => {
      const lastPurchase = material.purchases[0];
      return {
        id: material.id,
        name: material.name,
        unit: material.unit,
        currentStock: material.currentStock,
        minStockLevel: material.minStockLevel,
        vendorName: lastPurchase?.partner?.name || undefined,
        lastInventoryDate: lastPurchase?.date
          ? lastPurchase.date.toISOString()
          : undefined,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
      };
    }
  );

  const productionBatchesData = await db.productionBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      productType: true,
      storageLocation: true,
    },
  });

  // Process production batches to ensure they match the expected format
  const productionBatches: ProcessedProductionBatch[] =
    productionBatchesData.map((batch) => ({
      id: batch.id,
      quantity: batch.quantity,
      remainingQuantity: batch.remainingQuantity,
      productionDate: batch.productionDate,
      createdAt: batch.createdAt,
      productType: {
        id: batch.productType.id,
        name: batch.productType.name,
        hsnNumber: batch.productType.hsnNumber,
      },
      storageLocation: batch.storageLocation
        ? {
            id: batch.storageLocation.id,
            name: batch.storageLocation.name,
          }
        : {
            id: "",
            name: "Unknown",
          },
    }));

  const storageLocations = await db.storageLocation.findMany({
    orderBy: { name: "asc" },
  });

  const productTypes = await db.productType.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Production Inventory</h1>
      <ProductionSection
        productionBatches={productionBatches}
        rawMaterials={processedRawMaterials}
        storageLocations={storageLocations}
        productTypes={productTypes}
      />
    </div>
  );
}

