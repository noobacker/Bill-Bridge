import ProfitLossReport from "@/components/reports/profit-loss-report";

export default function ProfitLossReportWrapper({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  return <ProfitLossReport searchParams={searchParams} />;
} 