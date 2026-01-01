"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Calendar, Edit, Filter, Search, Trash } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format, subMonths } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { DatePicker, DateRangePicker } from "@/components/ui/date-picker"
import { type DateRange } from "react-day-picker"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"

interface ExpenseCategory {
  id: string
  name: string
}

interface Expense {
  id: string
  category: {
    id: string
    name: string
  }
  description: string | null
  amount: number
  date: Date
  formattedDate?: string
  vendorName?: string | null
  rawMaterialInfo?: string | null
  transactions?: {
    partner?: { name: string } | null
    amount: number
    date: Date
    description: string
    type: string
  }[]
  purchase?: {
    partner?: { name: string } | null
  }
}

interface ExpensesTableProps {
  expenses: Expense[]
  categories?: ExpenseCategory[]
}

// Determine the source of the expense
const getExpenseSource = (expense: Expense): string => {
  if (expense.rawMaterialInfo) {
    return "This expense was automatically created from the inventory system when raw material was added.";
  } else {
    return "This expense was manually added through the 'Add Expense' feature.";
  }
}

export function ExpensesTable({ expenses, categories = [] }: ExpensesTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  
  // Parse initial selected categories from URL
  const getInitialCategories = () => {
    const param = searchParams.get('categoryId')
    if (param && param.length > 0) {
      return param.split(',').filter(Boolean)
    }
    return []
  }
  const [selectedCategories, setSelectedCategories] = useState<string[]>(getInitialCategories())
  
  // Reset categories on initial page load/refresh
  useEffect(() => {
    if (!initialLoadComplete) {
      // Clear category filters on first load
      const params = new URLSearchParams(searchParams.toString())
      if (params.has('categoryId')) {
        params.delete('categoryId')
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      }
      setInitialLoadComplete(true)
    }
  }, [pathname, router, searchParams, initialLoadComplete])
  
  // Sync selectedCategories with URL changes
  useEffect(() => {
    const param = searchParams.get('categoryId')
    if (param && param.length > 0) {
      const ids = param.split(',').filter(Boolean)
      setSelectedCategories(ids)
    } else {
      setSelectedCategories([])
    }
  }, [searchParams])

  // Filter states
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : subMonths(new Date(), 1),
    to: searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : new Date(),
  })

  // Apply filters when they change
  useEffect(() => {
    if (dateRange?.from) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('startDate', format(dateRange.from, 'yyyy-MM-dd'))
      
      if (dateRange.to) {
        params.set('endDate', format(dateRange.to, 'yyyy-MM-dd'))
      } else {
        params.set('endDate', format(new Date(), 'yyyy-MM-dd'))
      }
      
      if (selectedCategories.length > 0) {
        params.set('categoryId', selectedCategories.join(','))
      } else {
        params.delete('categoryId')
      }
      
      router.push(`${pathname}?${params.toString()}`)
    }
  }, [dateRange, selectedCategories, pathname, router, searchParams])

  const filteredExpenses = expenses.filter(
    (expense) =>
      (selectedCategories.length === 0 || selectedCategories.includes(expense.category.id)) &&
      (
        expense.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.description && expense.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (expense.vendorName && expense.vendorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (expense.rawMaterialInfo && expense.rawMaterialInfo.toLowerCase().includes(searchTerm.toLowerCase()))
      )
  )

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      electricity: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      labor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      water: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
      "raw material": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      maintenance: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      fuel: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      transport: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    }
    return colors[category.toLowerCase()] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete expense")
      }

      toast({
        title: "Success",
        description: "Expense has been deleted successfully.",
      })

      setIsDeleteDialogOpen(false)
      setExpenseToDelete(null)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete expense.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search expenses..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Date Range Filter */}
          <DateRangePicker
            dateRange={dateRange}
            setDateRange={setDateRange}
            placeholder="Filter by date"
            className="w-[280px] overflow-hidden"
          />

          {/* Category Multi-Select Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Category
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2">
              <div className="font-medium px-2 pb-2">Filter by Category</div>
              <DropdownMenuCheckboxItem
                checked={selectedCategories.length === 0}
                onCheckedChange={() => setSelectedCategories([])}
              >
                All Categories
              </DropdownMenuCheckboxItem>
              {categories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedCategories((prev) => [...prev, category.id])
                    } else {
                      setSelectedCategories((prev) => prev.filter((id) => id !== category.id))
                    }
                  }}
                >
                  {category.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No expenses found. Please check the filters and try again.
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <Badge className={getCategoryColor(expense.category.name)}>{expense.category.name}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {expense.rawMaterialInfo || expense.description || "-"}
                  </TableCell>
                  <TableCell>₹{expense.amount.toLocaleString()}</TableCell>
                  <TableCell>{expense.formattedDate || new Date(expense.date).toISOString().split('T')[0]}</TableCell>
                  <TableCell>{expense.vendorName || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedExpense(expense)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        View More
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setExpenseToDelete(expense)
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedExpense && (
        <ExpenseDetailsDialog expense={selectedExpense} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete this expense?</p>
              {expenseToDelete && (
                <>
                  <p className="font-medium">Expense Details:</p>
                  <ul className="list-disc ml-5">
                    <li><span className="font-medium">Category:</span> {expenseToDelete.category.name}</li>
                    <li><span className="font-medium">Description:</span> {expenseToDelete.rawMaterialInfo || expenseToDelete.description || "-"}</li>
                    <li><span className="font-medium">Amount:</span> ₹{expenseToDelete.amount.toLocaleString()}</li>
                    <li><span className="font-medium">Date:</span> {expenseToDelete.formattedDate || new Date(expenseToDelete.date).toISOString().split('T')[0]}</li>
                  </ul>
                  <p className="mt-2 text-amber-600 dark:text-amber-400">{getExpenseSource(expenseToDelete)}</p>
                  <p className="text-destructive">This action cannot be undone.</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => expenseToDelete && handleDelete(expenseToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ExpenseDetailsDialog({ expense, open, onOpenChange }: { expense: Expense, open: boolean, onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Expense Details</DialogTitle>
          <DialogDescription>Full details for this expense.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div><b>Category:</b> {expense.category?.name}</div>
          <div><b>Amount:</b> ₹{expense.amount.toLocaleString()}</div>
          <div><b>Date:</b> {expense.formattedDate || new Date(expense.date).toISOString().split('T')[0]}</div>
          {expense.rawMaterialInfo && (
            <div><b>Raw Material:</b> {expense.rawMaterialInfo}</div>
          )}
          <div><b>Description:</b> {expense.description || "-"}</div>
          <div><b>Vendor:</b> {expense.vendorName || "-"}</div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{getExpenseSource(expense)}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
