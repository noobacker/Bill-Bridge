import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, DollarSign, TrendingUp } from "lucide-react"
import { db } from "@/lib/db"
import { startOfMonth, endOfMonth } from "date-fns"

export async function ReportsOverview() {
  // Get current month range
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Fetch invoices for current month
  const invoices = await db.invoice.findMany({
    where: {
      invoiceDate: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    select: { totalAmount: true },
  });
  const monthlyRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  // Fetch expenses for current month
  const expenses = await db.expense.findMany({
    where: {
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    select: { amount: true },
  });
  const monthlyExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Net profit
  const netProfit = monthlyRevenue - monthlyExpenses;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{monthlyRevenue.toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{monthlyExpenses.toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{netProfit.toLocaleString()}</div>
        </CardContent>
      </Card>
    </div>
  )
}
