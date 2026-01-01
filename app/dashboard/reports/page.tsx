import ReportsClientControls from "@/components/reports/reports-client-controls";
import ProfitLossReport from "@/components/reports/profit-loss-report";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams;
  const from = params?.from;
  const to = params?.to;

  return (
    <div className="space-y-6">
      <ReportsClientControls from={from} to={to} />
      <ProfitLossReport searchParams={{ from, to }} />
    </div>
  );
}
