// 'use client' removed to make this a valid async Server Component
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Calendar, Download } from "lucide-react"
import { db } from "@/lib/db"

function getDefaultDateRange() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const to = today;
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export default async function ProfitLossReport({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  // Get date range from searchParams or use default
  const defaultRange = getDefaultDateRange();
  const fromDate = searchParams?.from || defaultRange.from;
  const toDate = searchParams?.to || defaultRange.to;
  const from = new Date(fromDate);
  let to = new Date(toDate);
  // Add 1 day to 'to' and use less than (<) for inclusivity
  to.setDate(to.getDate() + 1);
  to.setHours(0, 0, 0, 0);

  // Fetch all invoices in the date range (using invoiceDate for business reporting)
  const invoices = await db.invoice.findMany({
    where: {
      invoiceDate: {
        gte: from,
        lt: to,
      },
    },
  });

  // Total Revenue (including GST) - using invoice.totalAmount directly
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  // With GST / Without GST
  const gstRevenue = invoices.filter(inv => inv.isGst).reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const nonGstRevenue = invoices.filter(inv => !inv.isGst).reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  // For the breakdown, we need to fetch sales to get product details
  const sales = await db.sale.findMany({
    where: {
      invoice: {
        invoiceDate: {
          gte: from,
          lt: to,
        },
      },
    },
    include: {
      productType: true,
      invoice: true,
    },
  });

  // Breakdown by Product/Service (proportionally allocate invoice total to each sale)
  const breakdown: Record<string, number> = {};
  const salesByInvoice: Record<string, { productTypeId: string, amount: number }[]> = {};
  
  // Group sales by invoice
  for (const sale of sales) {
    if (!salesByInvoice[sale.invoiceId]) {
      salesByInvoice[sale.invoiceId] = [];
    }
    salesByInvoice[sale.invoiceId].push({
      productTypeId: sale.productTypeId,
      amount: sale.amount || 0
    });
  }
  
  // For each invoice, allocate its totalAmount to products proportionally
  for (const invoice of invoices) {
    const invoiceSales = salesByInvoice[invoice.id] || [];
    const totalSalesAmount = invoiceSales.reduce((sum, s) => sum + s.amount, 0);
    
    if (totalSalesAmount > 0 && invoice.totalAmount) {
      for (const sale of invoiceSales) {
        const productType = sales.find(s => s.productTypeId === sale.productTypeId)?.productType;
        const name = productType?.name || "Unknown";
        const share = sale.amount / totalSalesAmount;
        const amountWithTax = invoice.totalAmount * share;
        breakdown[name] = (breakdown[name] || 0) + amountWithTax;
      }
    }
  }

  // Breakdown by Product/Service with GST and without GST
  const breakdownWithGST: Record<string, number> = {};
  const breakdownWithoutGST: Record<string, number> = {};

  // For each invoice, allocate its totalAmount to products proportionally, split by GST
  for (const invoice of invoices) {
    const invoiceSales = salesByInvoice[invoice.id] || [];
    const totalSalesAmount = invoiceSales.reduce((sum, s) => sum + s.amount, 0);
    if (totalSalesAmount > 0 && invoice.totalAmount) {
      for (const sale of invoiceSales) {
        const productType = sales.find(s => s.productTypeId === sale.productTypeId)?.productType;
        const name = productType?.name || "Unknown";
        const share = sale.amount / totalSalesAmount;
        const amountWithTax = invoice.totalAmount * share;
        if (invoice.isGst) {
          breakdownWithGST[name] = (breakdownWithGST[name] || 0) + amountWithTax;
        } else {
          breakdownWithoutGST[name] = (breakdownWithoutGST[name] || 0) + amountWithTax;
        }
      }
    }
  }

  // Calculate totals for With GST, Without GST, and row/column totals
  const totalWithGST = Object.values(breakdownWithGST).reduce((sum, v) => sum + v, 0);
  const totalWithoutGST = Object.values(breakdownWithoutGST).reduce((sum, v) => sum + v, 0);
  const totalAll = totalWithGST + totalWithoutGST;

  // Get all product/service names
  const allProductNames = Array.from(new Set([
    ...Object.keys(breakdownWithGST),
    ...Object.keys(breakdownWithoutGST),
  ]));

  // Fetch expenses (sum and by category)
  const expenses = await db.expense.findMany({
    where: {
      date: {
        gte: from,
        lte: to,
      },
    },
    include: { category: true },
  });
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const expensesByCategory: Record<string, { name: string; total: number }> = {};
  for (const expense of expenses) {
    const catId = expense.category.id;
    if (!expensesByCategory[catId]) {
      expensesByCategory[catId] = {
        name: expense.category.name,
        total: 0,
      };
    }
    expensesByCategory[catId].total += expense.amount || 0;
  }

  // Net profit and margin
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  // Helper for currency formatting with 2 decimal places
  const formatCurrency = (amount: number) =>
    amount.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace("₹", "₹");

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Total Revenue</span>
              <span className="font-medium">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span>With GST</span>
              <span className="font-medium">{formatCurrency(gstRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span>Without GST</span>
              <span className="font-medium">{formatCurrency(nonGstRevenue)}</span>
            </div>
            <hr className="my-2" />
            <div>
              <span className="font-semibold">Breakdown by Product/Service:</span>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm border-separate border-spacing-y-1 min-w-[400px]">
                  <thead>
                    <tr>
                      <th className="text-left whitespace-nowrap">Product/Service</th>
                      <th className="text-right whitespace-nowrap">With GST</th>
                      <th className="text-right whitespace-nowrap">Without GST</th>
                      <th className="text-right whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allProductNames.map((name) => {
                      const gst = breakdownWithGST[name] || 0;
                      const nonGst = breakdownWithoutGST[name] || 0;
                      const rowTotal = gst + nonGst;
                      return (
                        <tr key={name}>
                          <td className="whitespace-nowrap max-w-[180px] truncate">{name}</td>
                          <td className="text-right whitespace-nowrap">{formatCurrency(gst)}</td>
                          <td className="text-right whitespace-nowrap">{formatCurrency(nonGst)}</td>
                          <td className="text-right font-semibold whitespace-nowrap">{formatCurrency(rowTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.values(expensesByCategory)
              .filter((cat) => cat.total > 0)
              .sort((a, b) => b.total - a.total)
              .map((cat) => (
                <div className="flex justify-between" key={cat.name}>
                  <span>{cat.name}</span>
                  <span className="font-medium">{formatCurrency(cat.total)}</span>
                </div>
              ))}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Expenses</span>
              <span className="text-red-600">{formatCurrency(totalExpenses)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center text-2xl font-bold">
            <span>Net Profit</span>
            <span className={netProfit >= 0 ? "text-green-600" : "text-red-600"}>
              {formatCurrency(netProfit)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Profit Margin: {profitMargin}%
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
