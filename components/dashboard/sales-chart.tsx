"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { ProductFilter } from "./product-filter";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DateRangePicker } from "@/components/ui/date-picker";
import { type DateRange } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";
import { useI18n } from "@/components/i18n/i18n-provider";

interface ChartData {
  name: string;
  amount: number;
  quantity: number;
}

export function SalesChart() {
  const { t } = useI18n();
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"weekly" | "monthly" | "custom">("weekly");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedProductId) {
          queryParams.append("productTypeId", selectedProductId);
        }
        if (view === "custom" && dateRange?.from && dateRange?.to) {
          queryParams.append(
            "from",
            dateRange.from.toISOString().split("T")[0]
          );
          queryParams.append("to", dateRange.to.toISOString().split("T")[0]);
        } else {
          queryParams.append("view", view);
        }
        const response = await fetch(
          `/api/dashboard/sales?${queryParams.toString()}`
        );
        const salesData = await response.json();

        // Format the data for the chart
        const formattedData = salesData.map((item: any) => {
          // Parse date properly
          let dateLabel = item.date;
          try {
            const date = new Date(item.date);
            if (!isNaN(date.getTime())) {
              dateLabel = date.toISOString().split("T")[0]; // Ensure consistent format
            }
          } catch (e) {
            console.error("Date parsing error:", e);
          }

          return {
            name: dateLabel,
            amount: parseFloat((item.totalAmount || 0).toFixed(2)),
            quantity: item.totalQuantity || 0,
          };
        });

        setData(formattedData);
      } catch (error) {
        console.error("Failed to fetch sales data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (view === "custom" && (!dateRange?.from || !dateRange?.to)) return;
    fetchData();
  }, [selectedProductId, view, dateRange]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  const handleProductChange = (productId: string | null) => {
    setSelectedProductId(productId);
  };

  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <CardTitle>{t("dashboard.salesChart.title")}</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <ProductFilter onProductChange={handleProductChange} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="border rounded-md px-3 py-1.5 flex items-center gap-2 bg-background text-sm font-medium">
                {view === "weekly" && t("dashboard.view.weekly")}
                {view === "monthly" && t("dashboard.view.monthly")}
                {view === "custom" && (
                  <>
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {dateRange?.from && dateRange?.to
                      ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                      : t("dashboard.view.customRange")}
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setView("weekly")}>
                {t("dashboard.view.weekly")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView("monthly")}>
                {t("dashboard.view.monthly")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView("custom")}>
                {t("dashboard.view.customRange")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {view === "custom" && (
            <div className="ml-2 w-[220px]">
              <DateRangePicker
                dateRange={dateRange}
                setDateRange={setDateRange}
                placeholder={t("dashboard.view.dateRangePlaceholder")}
                numberOfMonths={1}
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pl-2">
        {loading ? (
          <div className="flex justify-center items-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="min-w-0">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={data}
                  margin={{
                    top: 8,
                    right: 16,
                    left: 8,
                    bottom: 8,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.1)"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#a3a3a3"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatDate}
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis
                    stroke="#a3a3a3"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === t("dashboard.salesChart.series.amount")) {
                        return [`₹${value}`, name];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => `${t("dashboard.common.dateLabel")}: ${formatDate(label)}`}
                    contentStyle={{
                      backgroundColor: "#1f1f1f",
                      border: "1px solid #333",
                      borderRadius: "6px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
                      padding: "8px 12px",
                      color: "#fff",
                    }}
                    itemStyle={{
                      color: "#fff",
                    }}
                    labelStyle={{
                      color: "#fff",
                      fontWeight: "bold",
                      marginBottom: "5px",
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    iconSize={10}
                    wrapperStyle={{ paddingTop: "10px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    activeDot={{
                      r: 8,
                      stroke: "#3b82f6",
                      strokeWidth: 2,
                      fill: "#1f1f1f",
                    }}
                    name={t("dashboard.salesChart.series.amount")}
                    dot={{
                      stroke: "#3b82f6",
                      strokeWidth: 2,
                      fill: "#1f1f1f",
                      r: 4,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="quantity"
                    stroke="#10b981"
                    strokeWidth={3}
                    activeDot={{
                      r: 8,
                      stroke: "#10b981",
                      strokeWidth: 2,
                      fill: "#1f1f1f",
                    }}
                    dot={{
                      stroke: "#10b981",
                      strokeWidth: 2,
                      fill: "#1f1f1f",
                      r: 4,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
