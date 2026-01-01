import { db } from "@/lib/db"
import { ExpensesTable } from "@/components/expenses/expenses-table"
import { CreateExpenseDialog } from "@/components/expenses/create-expense-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { I18nHeading } from "@/components/i18n/i18n-heading"
import { subMonths, format } from "date-fns"

// Helper function to ensure consistent date formatting between server and client
const formatDateConsistently = (date: Date) => {
  return format(date, 'yyyy-MM-dd')
}

// Ensure some default expense categories exist so they appear in the Add Expense dialog
async function ensureDefaultExpenseCategories() {
  const defaultNames = [
    "Electricity",
    "Fuel",
    "Labour",
    "Transport",
    "Water",
    "Maintenance",
    "Office Supplies",
    "Other",
  ]

  await Promise.all(
    defaultNames.map((name) =>
      db.expenseCategory.upsert({
        where: { name },
        update: {},
        create: { name, isDefault: true },
      })
    )
  )
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    startDate?: string, 
    endDate?: string,
    categoryId?: string 
  }>
}) {
  // Await searchParams for Next.js 15 sync dynamic API
  const params = await searchParams;

  // Default date range: last month to today
  const today = new Date()
  const defaultStartDate = subMonths(today, 1).toISOString().split('T')[0]
  const defaultEndDate = today.toISOString().split('T')[0]
  
  // Get filter parameters with defaults - properly handle searchParams
  const startDate = params?.startDate || defaultStartDate
  const endDate = params?.endDate || defaultEndDate
  const categoryIdParam = params?.categoryId || undefined

  // Parse dates for database query
  const startDateTime = new Date(startDate)
  const endDateTime = new Date(endDate)
  // Set end date to end of day
  endDateTime.setHours(23, 59, 59, 999)

  // Build the where clause for filtering
  const whereClause: any = {
    date: {
      gte: startDateTime,
      lte: endDateTime,
    },
  }

  // Add category filter if specified, handling multiple categories
  if (categoryIdParam) {
    // Split the comma-separated category IDs
    const categoryIds = categoryIdParam.split(',').filter(Boolean)
    
    // If there's only one category, use equals operator
    if (categoryIds.length === 1) {
      whereClause.categoryId = categoryIds[0]
    } 
    // If there are multiple categories, use "in" operator
    else if (categoryIds.length > 1) {
      whereClause.categoryId = {
        in: categoryIds
      }
    }
  }

  // Get all expense categories
  await ensureDefaultExpenseCategories()

  const categories = await db.expenseCategory.findMany({
    orderBy: {
      name: "asc",
    },
  })

  // Get expenses with filters applied
  const expenses = await db.expense.findMany({
    where: whereClause,
    orderBy: {
      date: "desc",
    },
    include: {
      category: true,
      partner: true,
      rawMaterial: true,
      transactions: {
        include: { partner: true },
      },
    },
  }) as any[]

  // Format expenses to include vendor name and raw material details
  const formattedExpenses = expenses.map(expense => {
    // Add vendor name from partner if available
    const vendorName = expense.partner?.name || 
      (expense.transactions && expense.transactions[0]?.partner?.name) || null;
    
    // Add raw material details if this is a raw material expense
    const rawMaterialInfo = expense.rawMaterial 
      ? `${expense.rawMaterial.name} (${expense.quantity || 0} ${expense.rawMaterial.unit})`
      : null;
    
    // Format date consistently to avoid hydration errors
    const formattedDate = formatDateConsistently(new Date(expense.date));
    
    return {
      ...expense,
      vendorName,
      rawMaterialInfo,
      formattedDate
    };
  });

  // Calculate summary statistics
  const totalExpense = formattedExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Define type for category aggregation
  interface CategoryTotal {
    name: string;
    total: number;
  }

  // Group expenses by category
  const expensesByCategory = formattedExpenses.reduce<Record<string, CategoryTotal>>((acc, expense) => {
    const categoryId = expense.category.id;
    if (!acc[categoryId]) {
      acc[categoryId] = {
        name: expense.category.name,
        total: 0,
      };
    }
    acc[categoryId].total += expense.amount;
    return acc;
  }, {});

  // Get raw material expenses and group by vendor
  const rawMaterialExpenses = formattedExpenses.filter(expense => 
    expense.category.name === "Raw Material" && expense.vendorName
  );

  // Group raw material expenses by vendor
  const expensesByVendor = rawMaterialExpenses.reduce<Record<string, number>>((acc, expense) => {
    const vendorName = expense.vendorName || "Unknown";
    if (!acc[vendorName]) {
      acc[vendorName] = 0;
    }
    acc[vendorName] += expense.amount;
    return acc;
  }, {});

  // Sort vendors by expense amount (descending)
  const topVendors = Object.entries(expensesByVendor)
    .sort(([, amountA], [, amountB]) => amountB - amountA)
    .slice(0, 5); // Top 5 vendors

  const partners = await db.partner.findMany({
    where: {
      OR: [{ type: "VENDOR" }, { type: "BOTH" }],
    },
    orderBy: { name: "asc" },
  })

  const rawMaterials = await db.rawMaterial.findMany({
    orderBy: { name: "asc" },
  })

  // Format dates consistently for summary cards
  const formattedStartDate = formatDateConsistently(new Date(startDate))
  const formattedEndDate = formatDateConsistently(new Date(endDate))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <I18nHeading as="h1" titleKey="nav.expenses" className="text-3xl font-bold" />
        <CreateExpenseDialog categories={categories} partners={partners} rawMaterials={rawMaterials} />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              <I18nHeading as="span" titleKey="expenses.total" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalExpense.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              For period {formattedStartDate} - {formattedEndDate}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {Object.values(expensesByCategory)
                .filter(category => category.total > 0)
                .sort((a, b) => b.total - a.total)
                .map((category) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <span className="text-sm">{category.name}</span>
                    <span className="font-medium">₹{category.total.toLocaleString()}</span>
                  </div>
                ))
              }
              {Object.values(expensesByCategory).filter(category => category.total > 0).length === 0 && (
                <div className="text-sm text-muted-foreground">No expense categories found</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Vendors (Raw Materials)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topVendors.length > 0 ? (
                topVendors.map(([vendor, amount]) => (
                  <div key={vendor} className="flex items-center justify-between">
                    <span className="text-sm">{vendor}</span>
                    <span className="font-medium">₹{Number(amount).toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No vendor expenses in this period</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ExpensesTable expenses={formattedExpenses} categories={categories} />
    </div>
  )
}
