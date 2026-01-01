import { RawMaterialsSection } from "@/components/inventory/raw-materials-section";
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

export default async function RawMaterialsPage() {
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

  const partners = await db.partner.findMany({
    where: {
      OR: [{ type: "VENDOR" }, { type: "BOTH" }],
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Raw Materials</h1>
      <RawMaterialsSection
        rawMaterials={processedRawMaterials}
        partners={partners}
      />
    </div>
  );
}

