import { Metadata } from "next";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { ProductionChart } from "@/components/dashboard/production-chart";
import { StockByLocationChart } from "@/components/dashboard/stock-by-location-chart";
import { LowStockAlerts } from "@/components/dashboard/low-stock-alerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Warehouse,
  TrendingUp,
  Package,
  Layers,
  AlertTriangle,
  Box,
} from "lucide-react";
import { db } from "@/lib/db";
import { I18nHeading } from "@/components/i18n/i18n-heading";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your business performance",
};

async function getProductInventory() {
  // Get all product types
  const allProductTypes = await db.productType.findMany({
    orderBy: {
      name: "asc",
    },
  });

  // Filter out services
  const productTypes = allProductTypes.filter((pt: any) => !pt.isService);

  // Get inventory data for each product type
  const inventoryData = await Promise.all(
    productTypes.map(async (productType) => {
      const totalStock = await db.productionBatch.aggregate({
        _sum: {
          remainingQuantity: true,
        },
        where: {
          productTypeId: productType.id,
        },
      });

      return {
        id: productType.id,
        name: productType.name,
        stock: totalStock._sum.remainingQuantity || 0,
      };
    })
  );

  return inventoryData;
}

async function getTodayProductionByProduct() {
  const now = new Date();
  // Fetch only recent batches (last 7 days) for efficiency
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const batches = await db.productionBatch.findMany({
    where: {
      productionDate: {
        gte: sevenDaysAgo,
      },
    },
    include: {
      productType: true,
    },
  });

  const todayKey = new Date().toISOString().slice(0, 10);
  const totals: Record<string, { name: string; quantity: number }> = {};

  for (const batch of batches) {
    const batchKey = batch.productionDate.toISOString().slice(0, 10);
    if (batchKey !== todayKey) continue;

    const productId = batch.productType.id;
    const productName = batch.productType.name;

    if (!totals[productId]) {
      totals[productId] = {
        name: productName,
        quantity: 0,
      };
    }

    totals[productId].quantity += batch.quantity;
  }

  return Object.values(totals);
}

async function getTotalSales() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const sales = await db.invoice.aggregate({
    _sum: {
      totalAmount: true,
    },
    where: {
      invoiceDate: {
        gte: startOfMonth,
      },
    },
  });

  return sales._sum.totalAmount || 0;
}

async function getRawMaterialInventory() {
  const rawMaterials = await db.rawMaterial.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      currentStock: true,
      minStockLevel: true,
      unit: true,
    },
  });

  return rawMaterials;
}

export default async function DashboardPage() {
  const productInventory = await getProductInventory();
  const todaysProductions = await getTodayProductionByProduct();
  const totalSales = await getTotalSales();
  const rawMaterials = await getRawMaterialInventory();

  // Count low stock materials
  const lowStockCount = rawMaterials.filter(
    (material) => material.currentStock < material.minStockLevel
  ).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Determine grid layout based on number of cards
  const totalCards = 3 + productInventory.length; // 3 fixed cards (today's production, sales, raw materials) + product cards
  const gridCols = totalCards <= 4 ? "lg:grid-cols-4" : "lg:grid-cols-5";

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-24 max-w-7xl mx-auto">
      <div className="space-y-0.5">
        <I18nHeading
          as="h2"
          titleKey="dashboard.title"
          className="text-2xl font-bold tracking-tight"
        />
        <I18nHeading
          as="p"
          titleKey="dashboard.subtitle"
          className="text-muted-foreground"
        />
      </div>

      <div
        className={`grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 ${gridCols}`}
      >
        {/* Product inventory cards */}
        {productInventory.map((product) => (
          <Card key={product.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {product.name}
              </CardTitle>
              <Box className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {product.stock.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Available inventory
              </p>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Productions (all products)
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {todaysProductions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No production recorded today
              </p>
            ) : (
              <div className="space-y-2 max-h-[110px] overflow-y-auto">
                {todaysProductions.map((item) => (
                  <div
                    key={item.name}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-muted-foreground">{item.name}:</span>
                    <span className="font-medium">
                      {item.quantity.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalSales)}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Raw Material Inventory
            </CardTitle>
            <div className="flex items-center gap-1">
              {lowStockCount > 0 && (
                <div className="flex items-center text-amber-500">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="ml-1 text-xs font-medium">
                    {lowStockCount}
                  </span>
                </div>
              )}
              <Layers className="h-4 w-4 text-muted-foreground ml-1" />
            </div>
          </CardHeader>
          <CardContent className="max-h-[110px] overflow-y-auto">
            <div className="space-y-2">
              {rawMaterials.map((material) => (
                <div key={material.id} className="flex justify-between text-xs">
                  <span className="flex items-center">
                    {material.currentStock < material.minStockLevel && (
                      <AlertTriangle className="h-3 w-3 text-amber-500 mr-1 inline-flex" />
                    )}
                    {material.name}
                  </span>
                  <span
                    className={`font-medium ${
                      material.currentStock < material.minStockLevel
                        ? "text-amber-500"
                        : ""
                    }`}
                  >
                    {material.currentStock} {material.unit}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <SalesChart />
        <ProductionChart />
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <StockByLocationChart className="lg:col-span-1" />
        <LowStockAlerts className="lg:col-span-1" />
      </div>
    </div>
  );
}
