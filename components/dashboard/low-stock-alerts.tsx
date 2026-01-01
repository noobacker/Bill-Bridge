"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/components/i18n/i18n-provider";

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
}

interface LowStockAlertsProps {
  className?: string;
}

export function LowStockAlerts({ className }: LowStockAlertsProps) {
  const { t } = useI18n();
  const [lowStockItems, setLowStockItems] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/dashboard/low-stock");
        const data = await response.json();
        setLowStockItems(data);
      } catch (error) {
        console.error("Failed to fetch low stock data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("dashboard.lowStock.title")}</CardTitle>
        {lowStockItems.length > 0 && (
          <Badge variant="destructive">{lowStockItems.length}</Badge>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-[180px]" />
                <Skeleton className="h-4 w-[60px]" />
              </div>
            ))}
          </div>
        ) : lowStockItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("dashboard.lowStock.empty")}
          </p>
        ) : (
          <div className="space-y-4">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.currentStock} / {item.minStockLevel} {item.unit}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
