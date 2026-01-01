"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Factory, Package, DollarSign, Boxes } from "lucide-react";
import { useI18n } from "@/components/i18n/i18n-provider";

interface DashboardCardsProps {
  todayProduction: number;
  totalStock: number;
  totalSales: number;
  rawMaterials: { id: string; name: string; currentStock: number; unit: string }[];
}

export function DashboardCards({
  todayProduction,
  totalStock,
  totalSales,
  rawMaterials,
}: DashboardCardsProps) {
  const { t } = useI18n();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("dashboard.cards.todayProduction.title")}
          </CardTitle>
          <Factory className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayProduction.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.cards.todayProduction.subtitle")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("dashboard.cards.totalStock.title")}
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStock.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.cards.totalStock.subtitle")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("dashboard.cards.totalSales.title")}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{totalSales.toLocaleString("en-IN")}</div>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.cards.totalSales.subtitle")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t("dashboard.cards.rawMaterials.title")}
          </CardTitle>
          <Boxes className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-xs text-muted-foreground">
            {rawMaterials.map((mat) => (
              <div key={mat.id} className="flex justify-between">
                <span>{mat.name}</span>
                <span>{mat.currentStock} {mat.unit}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
