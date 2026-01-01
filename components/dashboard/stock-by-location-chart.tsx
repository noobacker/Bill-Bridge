"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n/i18n-provider";

interface StockData {
  name: string;
  value: number;
}

interface StockByLocationChartProps {
  className?: string;
}

const COLORS = [
  "#6366f1",
  "#3b82f6",
  "#0ea5e9",
  "#06b6d4",
  "#14b8a6",
  "#10b981",
  "#22c55e",
];

export function StockByLocationChart({ className }: StockByLocationChartProps) {
  const { t } = useI18n();
  const [data, setData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/dashboard/stock-by-location");
        const stockData = await response.json();

        // Sort data alphabetically by location name to ensure consistent order
        const sortedData = stockData.sort((a: StockData, b: StockData) =>
          a.name.localeCompare(b.name)
        );

        setData(sortedData);
      } catch (error) {
        console.error("Failed to fetch stock by location data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1f1f1f] p-3 rounded-md shadow-md border border-[#333]">
          <p className="font-medium text-sm text-white">
            {payload[0].payload.name}
          </p>
          <p className="text-sm text-gray-300">
            <span className="font-medium">{payload[0].value}</span> {t("dashboard.stockByLocation.unitsInStock")}
          </p>
        </div>
      );
    }
    return null;
  };

  // Make Y-axis narrower on small screens to avoid horizontal overflow
  const yAxisWidth =
    viewportWidth < 420 ? 100 : viewportWidth < 768 ? 130 : 180;
  const rightMargin = viewportWidth < 420 ? 16 : 40;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("dashboard.stockByLocation.title")}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex justify-center items-center h-[300px] text-muted-foreground">
            {t("dashboard.stockByLocation.empty")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{
                top: 5,
                right: rightMargin,
                left: 8,
                bottom: 5,
              }}
              barGap={0}
              barCategoryGap={10}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.1)"
                horizontal={false}
              />
              <XAxis
                type="number"
                stroke="#a3a3a3"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                scale="band"
                width={yAxisWidth}
                tick={{ fontSize: 14, fill: "#fff", textAnchor: "end" }}
                stroke="#a3a3a3"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255, 255, 255, 0.1)" }}
                wrapperStyle={{ zIndex: 1000 }}
              />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                barSize={24}
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="transparent"
                  />
                ))}
                <LabelList
                  dataKey="name"
                  position="insideLeft"
                  fill="#fff"
                  fontSize={14}
                  offset={10}
                />
                <LabelList
                  dataKey="value"
                  position="right"
                  fill="#ffffff"
                  fontSize={12}
                  formatter={(value: any) => `${value}`}
                  offset={10}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
