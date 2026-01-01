"use client"

import { useState, useEffect, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Download, Edit, Search, Trash, CalendarIcon, ChevronLeft, ChevronRight, Phone } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
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
import { EditSaleDialog } from "./edit-sale-dialog"
import { Partner, ProductType, ProductionBatch, Sale } from "./types"
import { formatCurrency, formatQuantity, formatDate } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { format, addDays } from 'date-fns'
import { DateRange } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import Pagination from "@/components/ui/pagination";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SalesTableProps {
  sales: Sale[]
  partners: Partner[]
  productTypes: ProductType[]
  productionBatches: ProductionBatch[]
  cgstRate: number
  sgstRate: number
  igstRate: number
}

export function SalesTable({ sales, partners, productTypes, productionBatches, cgstRate, sgstRate, igstRate }: SalesTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedSaleInvoiceId, setSelectedSaleInvoiceId] = useState<string | null>(null)
  const [downloadInvoiceInfo, setDownloadInvoiceInfo] = useState<{ id: string; number: string } | null>(null)
  const [deleteDialogInfo, setDeleteDialogInfo] = useState<{ id: string; number: string } | null>(null)

  // Sorting and pagination state
  const [sortBy, setSortBy] = useState("date_desc") // date_desc, date_asc, inv_asc, inv_desc
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })

  // Group sales by invoice
  const groupedSales = useMemo(() => {
    // First, filter the sales based on search and date
    const filtered = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt)
      const searchTermLower = searchTerm.toLowerCase()

      // Date range filter
      let dateMatch = true
      if (date?.from) {
        const fromDate = new Date(date.from.setHours(0, 0, 0, 0))
        if (date.to) {
          const toDate = new Date(date.to.setHours(23, 59, 59, 999))
          dateMatch = saleDate >= fromDate && saleDate <= toDate
        } else {
          dateMatch = saleDate >= fromDate
        }
      }

      // Search term filter for client name and invoice number
      const searchMatch = 
        !searchTermLower ||
        sale.invoice.partner.name.toLowerCase().includes(searchTermLower) ||
        sale.invoice.invoiceNumber.toLowerCase().includes(searchTermLower)

      return dateMatch && searchMatch
    });

    // Then, group them by invoice ID
    const grouped: Record<string, any> = {};
    
    filtered.forEach(sale => {
      const invoiceId = sale.invoice.id;
      
      if (!grouped[invoiceId]) {
        grouped[invoiceId] = {
          invoice: sale.invoice,
          products: [],
          totalQuantity: 0
        };
      }
      
      grouped[invoiceId].products.push({
        id: sale.id,
        productType: sale.productType,
        quantity: sale.quantity,
        rate: sale.rate,
        amount: sale.amount,
        productionBatch: sale.productionBatch,
        batchDetails: sale.batchDetails
      });
      
      // Only add the quantity if it's explicitly set
      if (sale.quantity) {
        grouped[invoiceId].totalQuantity += sale.quantity;
      }
    });
    
    return Object.values(grouped);
  }, [sales, date, searchTerm]);

  // Sorting
  const sortedSales = useMemo(() => {
    let arr = [...groupedSales];
    if (sortBy === "date_asc") {
      arr.sort((a, b) => new Date(a.invoice.invoiceDate).getTime() - new Date(b.invoice.invoiceDate).getTime())
    } else if (sortBy === "date_desc") {
      arr.sort((a, b) => new Date(b.invoice.invoiceDate).getTime() - new Date(a.invoice.invoiceDate).getTime())
    } else if (sortBy === "inv_asc") {
      arr.sort((a, b) => a.invoice.invoiceNumber.localeCompare(b.invoice.invoiceNumber))
    } else if (sortBy === "inv_desc") {
      arr.sort((a, b) => b.invoice.invoiceNumber.localeCompare(a.invoice.invoiceNumber))
    }
    return arr;
  }, [groupedSales, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedSales.length / pageSize) || 1;
  const paginatedSales = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedSales.slice(start, start + pageSize);
  }, [sortedSales, page, pageSize]);

  useEffect(() => {
    setPage(1); // Reset to first page on search, sort, or page size change
  }, [searchTerm, sortBy, pageSize]);

  const stats = useMemo(() => {
    const totalInvoices = groupedSales.length;
    const uniqueClients = new Set(groupedSales.map(group => group.invoice.partner.name)).size;
    
    // Calculate total quantity by summing up all product quantities directly
    const totalQuantity = groupedSales.reduce((sum, group) => {
      // Use the pre-calculated totalQuantity from the grouping logic
      return sum + (group.totalQuantity || 0);
    }, 0);
    
    const totalAmount = groupedSales.reduce((sum, group) => sum + group.invoice.totalAmount, 0);

    const allProducts = groupedSales.flatMap(group => group.products);
    const totalRateSum = allProducts.reduce((sum, product) => sum + product.rate, 0);
    const averageRate = allProducts.length > 0 ? totalRateSum / allProducts.length : 0;

    return {
      totalInvoices,
      uniqueClients,
      totalQuantity,
      averageRate,
      totalAmount,
    }
  }, [groupedSales]);

  const handleDelete = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/sales/multi-batch/${invoiceId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete sale")
      }

      toast({
        title: "Success",
        description: "Sale has been deleted successfully.",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete sale.",
        variant: "destructive",
      })
    }
  }

  const downloadInvoice = async (invoiceId: string, invoiceNumber: string, includeBankDetails: boolean) => {
    try {
      toast({
        title: "Generating Invoice",
        description: `Preparing invoice ${invoiceNumber} for download...`,
      })

      // Use the new API endpoint to download the invoice
      const response = await fetch(`/api/invoice/${invoiceId}/download?includeBankDetails=${includeBankDetails}`);
      
      if (!response.ok) {
        throw new Error("Failed to generate invoice");
      }
      
      // Get filename from the Content-Disposition header
      const disposition = response.headers.get('content-disposition');
      let filename = `Invoice-${invoiceNumber}.pdf`; // Default filename
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename; // Use the filename from the server
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Invoice downloaded successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download invoice.",
        variant: "destructive",
      })
    }
  }

  const handleCall = (phone?: string | null) => {
    if (phone) {
      window.location.href = `tel:${phone}`
    } else {
      toast({ title: "No contact number found." })
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueClients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatQuantity(stats.totalQuantity)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls row: search, sort */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex-1 flex items-center gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by client or invoice..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="border rounded px-2 py-1 bg-background text-foreground"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="date_desc">Newest Date</option>
            <option value="date_asc">Oldest Date</option>
            <option value="inv_asc">Invoice # (A-Z)</option>
            <option value="inv_desc">Invoice # (Z-A)</option>
          </select>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Invoice #</TableHead>
              <TableHead className="w-48">Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Products</TableHead>
              <TableHead className="text-right w-24">Total Quantity</TableHead>
              <TableHead className="text-right w-32">Total Amount</TableHead>
              <TableHead className="w-32 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No sales found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedSales.map((group) => (
                <TableRow
                  key={group.invoice.id}
                  className="hover:bg-muted/40 transition-all border-b border-muted-foreground/10"
                  style={{ height: 64 }}
                >
                  <TableCell className="font-bold align-middle text-base">{group.invoice.invoiceNumber}</TableCell>
                  <TableCell className="align-middle">
                    <div className="font-medium">{formatDate(group.invoice.invoiceDate)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Created: {formatDate(group.invoice.createdAt)}</div>
                  </TableCell>
                  <TableCell className="align-middle">
                    <div className="font-bold">{group.invoice.partner.name}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant={group.invoice.paymentType === "CASH" ? "outline" : "secondary"} className="text-xs">
                        {group.invoice.paymentType}
                      </Badge>
                      <Badge variant={group.invoice.isGst ? "default" : "outline"} className="text-xs">
                        {group.invoice.isGst ? "GST" : "Non-GST"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="align-middle">
                    <div className="flex flex-wrap gap-2">
                      {group.products.map((product: any, idx: number) => (
                        <div key={product.id} className="bg-muted/60 rounded-lg px-3 py-2 min-w-[120px] max-w-xs flex flex-col shadow-sm border border-muted-foreground/10">
                          <div className="font-medium text-sm truncate">{product.productType.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            HSN: {product.productType.hsnNumber} | Qty: {formatQuantity(product.quantity)} | Rate: {formatCurrency(product.rate)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right align-middle font-semibold text-base">{formatQuantity(group.totalQuantity)}</TableCell>
                  <TableCell className="text-right align-middle font-semibold text-base">{formatCurrency(group.invoice.totalAmount)}</TableCell>
                  <TableCell className="align-middle text-center">
                    <TooltipProvider>
                      <div className="flex items-center justify-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {group.invoice.partner.phone ? (
                              <a
                                href={`tel:${(group.invoice.partner.phone || '').replace(/[^+\d]/g, "")}`}
                                className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted transition-colors"
                                tabIndex={0}
                                aria-label={`Call ${group.invoice.partner.name}`}
                              >
                                <Phone className="h-5 w-5" />
                              </a>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => toast({ title: "No contact number found." })}
                                className="opacity-50 cursor-not-allowed"
                                aria-label="No phone number available"
                              >
                                <Phone className="h-5 w-5" />
                              </Button>
                            )}
                          </TooltipTrigger>
                          <TooltipContent>{group.invoice.partner.phone ? `Call ${group.invoice.partner.name}` : "No phone number available"}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => { setSelectedSaleInvoiceId(group.invoice.id); setIsEditDialogOpen(true); }} className="hover:text-primary">
                              <Edit className="h-5 w-5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => setDownloadInvoiceInfo({ id: group.invoice.id, number: group.invoice.invoiceNumber })} className="hover:text-primary">
                              <Download className="h-5 w-5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Download</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => setDeleteDialogInfo({ id: group.invoice.id, number: group.invoice.invoiceNumber })} className="hover:text-destructive">
                              <Trash className="h-5 w-5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      <Pagination
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        totalItems={sortedSales.length}
        pageSizeOptions={[5, 10, 20, 50, 100]}
      />

      <AlertDialog open={!!downloadInvoiceInfo} onOpenChange={(open) => !open && setDownloadInvoiceInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Download Invoice {downloadInvoiceInfo?.number}</AlertDialogTitle>
            <AlertDialogDescription>
              Mention the bank details in this invoice?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
             <AlertDialogCancel
              onClick={() => {
                if (downloadInvoiceInfo) {
                  downloadInvoice(downloadInvoiceInfo.id, downloadInvoiceInfo.number, false)
                }
                setDownloadInvoiceInfo(null)
              }}
            >
              No
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (downloadInvoiceInfo) {
                  downloadInvoice(downloadInvoiceInfo.id, downloadInvoiceInfo.number, true)
                }
                setDownloadInvoiceInfo(null)
              }}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDialogInfo} onOpenChange={(open) => !open && setDeleteDialogInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice {deleteDialogInfo?.number}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogInfo(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteDialogInfo) {
                  handleDelete(deleteDialogInfo.id)
                }
                setDeleteDialogInfo(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isEditDialogOpen && selectedSaleInvoiceId && (
        <EditSaleDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          invoiceId={selectedSaleInvoiceId}
          partners={partners}
          productTypes={productTypes}
          productionBatches={productionBatches}
          cgstRate={cgstRate}
          sgstRate={sgstRate}
          igstRate={igstRate}
        />
      )}
    </div>
  )
}
