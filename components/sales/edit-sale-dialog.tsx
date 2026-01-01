"use client"

import type React from "react"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Trash2, AlertCircle, Plus, PlusCircle, X } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Partner, ProductType, ProductionBatch, Invoice, BatchSelection } from "./types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { DatePicker } from "@/components/ui/date-picker"
import { TransportationCombobox } from "./TransportationCombobox"
import { DriverCombobox } from "./DriverCombobox"

interface EditSaleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  partners: Partner[]
  productTypes: ProductType[]
  productionBatches: ProductionBatch[]
  cgstRate: number
  sgstRate: number
  igstRate: number
}

// Local detailed sale type for the edit dialog
interface DetailedSale {
  id: string
  quantity: number
  rate: number
  amount: number
  productTypeId: string
  productionBatchId: string | null
  productType?: {
    id: string
    name: string
    hsnNumber: string
    isService?: boolean
    cgstRate?: number
    sgstRate?: number
  }
  productionBatch?: {
    id: string
    storageLocation: {
      name: string
    } | null
    remainingQuantity: number
  } | null
}

// Group sales by product type
interface ProductGroup {
  productTypeId: string
  productType: {
    id: string
    name: string
    hsnNumber: string
    isService?: boolean
    cgstRate?: number
    sgstRate?: number
  }
  rate: number
  sales: DetailedSale[]
  batchSelections: BatchSelection[]
}

// Local invoice type that includes detailed sales
interface DetailedInvoice extends Omit<Invoice, 'sales'> {
  sales: DetailedSale[]
  transportationId?: string | null
  driverName?: string | null
  driverPhone?: string | null
  transportVehicle?: string | null
  deliveryCity?: string | null
}

// Add this at the top of the file, outside any functions
const serviceHSNCodes = ["998513", "996511", "998519"]; // HSN codes for services

export function EditSaleDialog({
  open,
  onOpenChange,
  invoiceId,
  partners,
  productTypes,
  productionBatches,
  cgstRate,
  sgstRate,
  igstRate,
}: EditSaleDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [invoice, setInvoice] = useState<DetailedInvoice | null>(null)
  const [invoiceError, setInvoiceError] = useState("")
  const [quantityError, setQuantityError] = useState("")
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState("")
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([])
  // Add state to track if form has been modified
  const [isFormModified, setIsFormModified] = useState(false)
  // Store original form data for comparison
  const [originalFormData, setOriginalFormData] = useState<any>(null)
  const [originalProductGroups, setOriginalProductGroups] = useState<ProductGroup[]>([])

  // --- Transportation & Driver State ---
  const [transportationOptions, setTransportationOptions] = useState<{ id: string, name: string }[]>([])
  const [selectedTransportation, setSelectedTransportation] = useState<{ id: string, name: string } | null>(null)
  const [isTransportLoading, setIsTransportLoading] = useState(false)
  const [driverOptions, setDriverOptions] = useState<{ name: string; phone: string }[]>([])
  const [selectedDriver, setSelectedDriver] = useState<{ name: string; phone: string } | null>(null)

  const [formData, setFormData] = useState({
    invoiceNumber: "",
    partnerId: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    isGst: true,
    paymentType: "CASH",
    paymentStatus: "PENDING",
    paidAmount: 0,
    remarks: "",
    transportMode: "",
    transportVehicle: "",
    deliveryCity: "",
  })

  // Fetch invoice data when dialog opens
  useEffect(() => {
    if (open && invoiceId) {
      fetchInvoiceData()
      // Reset modification state when dialog opens
      setIsFormModified(false)
    }
  }, [open, invoiceId])

  // --- Fetch transportation options on mount ---
  useEffect(() => {
    fetch("/api/transportation")
      .then(res => res.json())
      .then(data => setTransportationOptions(data.map((t: any) => ({ id: t.id, name: t.name }))))
  }, [])
  // --- Set selected transportation from invoice ---
  useEffect(() => {
    if (invoice && invoice.transportationId) {
      const match = transportationOptions.find(t => t.id === invoice.transportationId)
      if (match) setSelectedTransportation(match)
    }
  }, [invoice, transportationOptions])
  // --- Fetch drivers for selected transportation ---
  useEffect(() => {
    if (selectedTransportation && selectedTransportation.id) {
      fetch(`/api/transportation/${selectedTransportation.id}`)
        .then(res => res.json())
        .then(data => setDriverOptions(Array.isArray(data.drivers) ? data.drivers : []))
    } else {
      setDriverOptions([])
    }
    setSelectedDriver(null)
  }, [selectedTransportation])
  // --- Set selected driver from invoice ---
  useEffect(() => {
    if (invoice && invoice.driverName && invoice.driverPhone && driverOptions.length > 0) {
      const match = driverOptions.find(d => d.name === invoice.driverName && d.phone === invoice.driverPhone)
      if (match) setSelectedDriver(match)
      else if (invoice.driverName || invoice.driverPhone) setSelectedDriver({ name: invoice.driverName, phone: invoice.driverPhone })
    }
  }, [invoice, driverOptions])

  const fetchInvoiceData = async () => {
    setIsFetching(true)
    try {
      const response = await fetch(`/api/sales/multi-batch/${invoiceId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch invoice data")
      }

      const data = await response.json()
      setInvoice(data)
      setOriginalInvoiceNumber(data.invoiceNumber)
      
      // Group sales by product type
      const groups: Record<string, ProductGroup> = {}
      
      if (data.sales && data.sales.length > 0) {
        data.sales.forEach((sale: DetailedSale) => {
          if (!groups[sale.productTypeId]) {
            groups[sale.productTypeId] = {
              productTypeId: sale.productTypeId,
              productType: sale.productType || { 
                id: sale.productTypeId,
                name: "Unknown Product",
                hsnNumber: "",
                isService: false
              },
              rate: sale.rate,
              sales: [],
              batchSelections: []
            }
          }
          
          groups[sale.productTypeId].sales.push(sale)
          
          // Only add batch selection if it's not a service
          if (sale.productionBatchId) {
            const locationName = sale.productionBatch?.storageLocation?.name || "Unknown Location";
            const currentRemaining = sale.productionBatch?.remainingQuantity || 0;
            const availableQuantity = currentRemaining + sale.quantity;
            
            groups[sale.productTypeId].batchSelections.push({
              batchId: sale.productionBatchId,
              quantity: sale.quantity,
              locationName,
              availableQuantity
            });
          } else if (sale.productType?.isService || (sale.productType?.hsnNumber && serviceHSNCodes.includes(sale.productType.hsnNumber))) {
            // For services, create a special batch selection
            groups[sale.productTypeId].batchSelections.push({
              batchId: `service_${sale.productTypeId}`,
              quantity: sale.quantity,
              locationName: "Service",
              availableQuantity: Infinity
            });
          }
        });
        
        const groupsArray = Object.values(groups);
        setProductGroups(groupsArray);
        // Store original product groups for comparison
        setOriginalProductGroups(JSON.parse(JSON.stringify(groupsArray)));
      }
      
      const newFormData = {
        invoiceNumber: data.invoiceNumber,
        partnerId: data.partnerId,
        invoiceDate: new Date(data.invoiceDate).toISOString().split("T")[0],
        isGst: data.isGst,
        paymentType: data.paymentType,
        paymentStatus: data.paymentStatus || "PENDING",
        paidAmount: data.paidAmount || 0,
        remarks: data.remarks || "",
        transportMode: data.transportMode || "",
        transportVehicle: data.transportVehicle || "",
        deliveryCity: data.deliveryCity || "",
      };
      
      setFormData(newFormData);
      // Store original form data for comparison
      setOriginalFormData(JSON.parse(JSON.stringify(newFormData)));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load invoice data. Please try again.",
        variant: "destructive",
      })
      onOpenChange(false)
    } finally {
      setIsFetching(false)
    }
  }

  // Check if form has been modified whenever form data or product groups change
  useEffect(() => {
    if (!originalFormData || !originalProductGroups.length) return;
    
    // Check if form data has changed
    const formChanged = Object.keys(formData).some(key => 
      formData[key as keyof typeof formData] !== originalFormData[key]
    );
    
    // Check if product groups have changed
    const productsChanged = JSON.stringify(productGroups) !== JSON.stringify(originalProductGroups);
    
    setIsFormModified(formChanged || productsChanged);
  }, [formData, productGroups, originalFormData, originalProductGroups]);

  // Calculated fields for all products
  const { subtotal, totalTax, totalAmount, totalQuantity } = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let totalQuantity = 0;
    
    productGroups.forEach(group => {
      const productType = group.productType;
      const groupQuantity = group.batchSelections.reduce((sum, batch) => sum + batch.quantity, 0);
      totalQuantity += groupQuantity || 0;
      
      const amount = groupQuantity * group.rate;
      subtotal += amount;
      
      if (formData.isGst) {
        const productCgstRate = productType.cgstRate ?? cgstRate;
        const productSgstRate = productType.sgstRate ?? sgstRate;
        const productIgstRate = productType.igstRate ?? igstRate;
        totalTax += amount * (productCgstRate + productSgstRate + productIgstRate) / 100;
      }
    });
    
    return {
      subtotal,
      totalTax,
      totalAmount: subtotal + totalTax,
      totalQuantity
    };
  }, [productGroups, formData.isGst, cgstRate, sgstRate, igstRate]);

  // Check if invoice number already exists
  const checkInvoiceNumber = async (invoiceNumber: string) => {
    // Skip check if the invoice number hasn't changed
    if (invoiceNumber === originalInvoiceNumber) {
      setInvoiceError("");
      return false;
    }
    
    try {
      const response = await fetch(`/api/check-invoice?invoiceNumber=${encodeURIComponent(invoiceNumber)}`);
      const data = await response.json();
      
      if (data.exists) {
        setInvoiceError(`Invoice number ${invoiceNumber} already exists. Please use a different number.`);
        return true;
      } else {
        setInvoiceError("");
        return false;
      }
    } catch (error) {
      console.error("Error checking invoice:", error);
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === "invoiceNumber") {
      setInvoiceError("");
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: name === "rate" ? Number.parseFloat(value) || 0 : value,
    }))
  }

  const handleInvoiceBlur = async () => {
    // Only check if the invoice number has changed
    if (formData.invoiceNumber !== originalInvoiceNumber) {
      await checkInvoiceNumber(formData.invoiceNumber);
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // If product type changes, reset batch selections
    if (name === "partnerId") {
      setProductGroups(prev => prev.map(group => ({
        ...group,
        batchSelections: []
      })));
      setQuantityError("");
    }
  }

  const handleGstChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      isGst: value === "true",
    }))
  }

  const handlePaymentTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      paymentType: value,
    }))
  }

  const handlePaymentStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, paymentStatus: value }))
  }

  const handlePaidAmountChange = (value: string) => {
    const paid = parseFloat(value) || 0;
    setFormData((prev) => ({
      ...prev,
      paidAmount: paid,
    }));
  }

  // Update batch quantity for a specific product
  const updateBatchQuantity = (productTypeId: string, batchId: string, quantity: number) => {
    setProductGroups(prevGroups => 
      prevGroups.map(group => {
        if (group.productTypeId === productTypeId) {
          return {
            ...group,
            batchSelections: group.batchSelections.map(selection => 
              selection.batchId === batchId 
                ? { ...selection, quantity } 
                : selection
            )
          };
        }
        return group;
      })
    );
  };

  // Add a new product to the invoice
  const addProductItem = () => {
    const newProductGroup: ProductGroup = {
      productTypeId: "",
      productType: {
        id: "",
        name: "",
        hsnNumber: "",
        isService: false
      },
      rate: 0,
      sales: [],
      batchSelections: []
    };
    setProductGroups(prev => [...prev, newProductGroup]);
  };

  // Remove a product from the invoice
  const removeProductItem = (productTypeId: string) => {
    setProductGroups(prev => prev.filter(group => group.productTypeId !== productTypeId));
  };

  // Update product type and rate
  const handleProductChange = (index: number, field: string, value: any) => {
    setProductGroups(prev => {
      const updated = [...prev];
      if (field === "productTypeId") {
        const productType = productTypes.find(p => p.id === value);
        if (productType) {
          updated[index] = {
            ...updated[index],
            productTypeId: value,
            productType: productType,
            batchSelections: [] // Reset batch selections when product changes
          };
        }
      } else if (field === "rate") {
        updated[index] = {
          ...updated[index],
          rate: value
        };
      }
      return updated;
    });
  };

  // Add a batch to a product
  const addBatchToItem = (productTypeId: string, batchId: string, quantity: number) => {
    const batch = productionBatches.find(b => b.id === batchId);
    if (!batch) return;

    setProductGroups(prev => 
      prev.map(group => {
        if (group.productTypeId === productTypeId) {
          // Check if batch is already selected
          if (group.batchSelections.some(bs => bs.batchId === batchId)) {
            toast({
              title: "Batch already selected",
              description: "This batch is already in the list for this product.",
              variant: "destructive",
            });
            return group;
          }
          
          const newBatchSelection: BatchSelection = {
            batchId,
            quantity: quantity,
            locationName: batch.storageLocation?.name || "Unknown",
            availableQuantity: batch.remainingQuantity,
          };
          
          return {
            ...group,
            batchSelections: [...group.batchSelections, newBatchSelection]
          };
        }
        return group;
      })
    );
  };

  // Remove a batch from a product
  const removeBatchFromItem = (productTypeId: string, batchId: string) => {
    setProductGroups(prev => 
      prev.map(group => {
        if (group.productTypeId === productTypeId) {
          return {
            ...group,
            batchSelections: group.batchSelections.filter(bs => bs.batchId !== batchId)
          };
        }
        return group;
      })
    );
  };

  const validateForm = (): boolean => {
    if (!formData.invoiceNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Invoice number is required.",
        variant: "destructive",
      })
      return false
    }

    if (!formData.partnerId) {
      toast({
        title: "Validation Error",
        description: "Please select a client.",
        variant: "destructive",
      })
      return false
    }

    // Check if each product group has valid quantities
    for (const group of productGroups) {
      const totalQuantity = group.batchSelections.reduce((sum, batch) => sum + batch.quantity, 0);
      if (totalQuantity <= 0) {
        toast({
          title: "Validation Error",
          description: `Total quantity for ${group.productType.name} must be greater than 0.`,
          variant: "destructive",
        })
        return false
      }

      // For non-service products, check each batch
      if (!group.productType.isService) {
        for (const selection of group.batchSelections) {
          if (selection.quantity > selection.availableQuantity) {
            toast({
              title: "Validation Error",
              description: `Quantity for batch ${selection.locationName} exceeds available stock.`,
              variant: "destructive",
            })
            return false
          }
        }
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateForm()) return
    
    setIsLoading(true)

    try {
      // Check if invoice number exists and is different from original
      if (
        formData.invoiceNumber !== originalInvoiceNumber &&
        (await checkInvoiceNumber(formData.invoiceNumber))
      ) {
        setInvoiceError("Invoice number already exists")
        setIsLoading(false)
        return
      }

      // Update invoice details
      const invoiceResponse = await fetch(`/api/sales/multi-batch/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceNumber: formData.invoiceNumber,
          partnerId: formData.partnerId,
          invoiceDate: formData.invoiceDate,
          isGst: formData.isGst,
          paymentType: formData.paymentType,
          paymentStatus: formData.paymentStatus,
          paidAmount: formData.paymentStatus === "COMPLETE" ? totalAmount : formData.paymentStatus === "PENDING" ? 0 : formData.paidAmount,
          pendingAmount: formData.paymentStatus === "COMPLETE" ? 0 : formData.paymentStatus === "PENDING" ? totalAmount : totalAmount - (formData.paidAmount || 0),
          remarks: formData.remarks,
          transportMode: formData.transportMode,
          transportVehicle: formData.transportVehicle,
          deliveryCity: formData.deliveryCity,
        }),
      })

      if (!invoiceResponse.ok) {
        const errorData = await invoiceResponse.json()
        throw new Error(errorData.message || "Failed to update invoice")
      }

      // First, delete all existing sales for this invoice
      const deleteResponse = await fetch(`/api/sales/delete-all/${invoiceId}`, {
        method: "DELETE",
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.message || "Failed to clear existing sales");
      }

      // Process product groups in parallel to speed up updates
      let hasProductErrors = false
      await Promise.all(
        productGroups.map(async (item) => {
          // Skip products without a selected type or with zero quantity
          if (!item.productTypeId) return

          const totalQuantity = item.batchSelections.reduce(
            (sum: number, batch: { quantity: number }) => sum + batch.quantity,
            0
          )
          if (totalQuantity <= 0) return

          const productResponse = await fetch("/api/sales/products", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              invoiceId: invoiceId,
              productTypeId: item.productTypeId,
              rate: item.rate,
              batchSelections: item.batchSelections.filter(
                (b: { quantity: number }) => b.quantity > 0
              ),
            }),
          })

          if (!productResponse.ok) {
            const errorData = await productResponse.json()
            toast({
              title: "Error adding product",
              description: errorData.message || "Failed to add product",
              variant: "destructive",
            })
            hasProductErrors = true
          }
        })
      )

      if (!hasProductErrors) {
        toast({
          title: "Success",
          description: "Sale updated successfully",
        })
        onOpenChange(false)
        router.refresh()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return null // Or a loading spinner component
  }

  // Empty state for no products
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <span className="text-6xl mb-4">🗂️</span>
      <div className="text-lg font-semibold mb-2">No products yet</div>
      <div className="text-sm">Add your first product to this sale.</div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sale</DialogTitle>
          <DialogDescription>Update sale details for invoice {formData.invoiceNumber}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-3">
            {/* Modern, grouped form header */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-muted/40 p-4 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                  onBlur={handleInvoiceBlur}
                  className={invoiceError ? "border-red-500" : ""}
                />
                {invoiceError && (
                  <Alert variant="destructive" className="py-2 mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{invoiceError}</AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <DatePicker
                  date={new Date(formData.invoiceDate)}
                  setDate={(date) => date && handleChange({ target: { name: "invoiceDate", value: date.toISOString().split("T")[0] } } as any)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partnerId">Client</Label>
                <Select 
                  value={formData.partnerId} 
                  onValueChange={(value) => handleSelectChange("partnerId", value)} 
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>GST Applicable</Label>
                <RadioGroup
                  value={formData.isGst ? "true" : "false"}
                  onValueChange={handleGstChange}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="gst-yes" />
                    <Label htmlFor="gst-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="gst-no" />
                    <Label htmlFor="gst-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <RadioGroup
                  value={formData.paymentStatus}
                  onValueChange={handlePaymentStatusChange}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="COMPLETE" id="payment-status-complete" />
                    <Label htmlFor="payment-status-complete">Paid</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PARTIAL" id="payment-status-partial" />
                    <Label htmlFor="payment-status-partial">Partial Paid</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PENDING" id="payment-status-pending" />
                    <Label htmlFor="payment-status-pending">Credit/Pending</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <RadioGroup
                  value={formData.paymentType}
                  onValueChange={handlePaymentTypeChange}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CASH" id="payment-cash" />
                    <Label htmlFor="payment-cash">Cash</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ONLINE" id="payment-online" />
                    <Label htmlFor="payment-online">Online</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transportation">Transportation</Label>
                <TransportationCombobox
                  options={transportationOptions}
                  value={selectedTransportation}
                  onChange={async (option) => {
                    setSelectedTransportation(option)
                    setFormData(f => ({ ...f, transportationId: option?.id || "" }))
                  }}
                  onCreate={async ({ name, phone, city, ownerName }) => {
                    setIsTransportLoading(true)
                    try {
                      const res = await fetch("/api/transportation", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name, phone, city, ownerName }),
                      })
                      if (!res.ok) throw new Error(await res.text())
                      const newTransport = await res.json()
                      setTransportationOptions(prev => [...prev, { id: newTransport.id, name: newTransport.name }])
                      return { id: newTransport.id, name: newTransport.name }
                    } finally {
                      setIsTransportLoading(false)
                    }
                  }}
                  loading={isTransportLoading}
                />
              </div>
              {selectedTransportation && (
                <div className="space-y-2">
                  <Label>Driver (optional)</Label>
                  <DriverCombobox
                    options={driverOptions}
                    value={selectedDriver}
                    onChange={setSelectedDriver}
                    onCreate={async ({ name, phone }) => {
                      const transportRes = await fetch(`/api/transportation/${selectedTransportation.id}`)
                      const transport = await transportRes.json()
                      const newDrivers = [...driverOptions, { name, phone }]
                      await fetch(`/api/transportation/${selectedTransportation.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: transport.name,
                          ownerName: transport.ownerName,
                          phone: transport.phone,
                          city: transport.city,
                          drivers: newDrivers,
                        }),
                      })
                      setDriverOptions(newDrivers)
                      return { name, phone }
                    }}
                    loading={isTransportLoading}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="transportVehicle">Transport vehicle - number</Label>
                <Input
                  id="transportVehicle"
                  placeholder="e.g., MH12AB1234"
                  value={formData.transportVehicle}
                  onChange={e => setFormData(f => ({ ...f, transportVehicle: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryCity">Delivery city</Label>
                <Input
                  id="deliveryCity"
                  placeholder="e.g., Pune"
                  value={formData.deliveryCity}
                  onChange={e => setFormData(f => ({ ...f, deliveryCity: e.target.value }))}
                />
              </div>
            </div>

            {/* Products Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2 sticky top-0 z-10 bg-background/95 py-2 shadow-sm">
                <h3 className="text-lg font-semibold tracking-tight">Products</h3>
              </div>
              <div className="space-y-6">
                {productGroups.length === 0 ? (
                  renderEmptyState()
                ) : (
                  productGroups.map((item, index) => (
                    <Card key={index} className="relative overflow-hidden animate-fade-in">
                      {/* Animated accent bar */}
                      <div className="absolute left-0 top-0 h-full w-1 bg-blue-500 transition-all duration-700 animate-grow-bar" />
                      <CardHeader className="pb-2 pl-6 pt-4">
                        <CardTitle className="text-base font-semibold">Product #{index + 1}</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 pl-6 pr-4 pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Product Type</Label>
                            <Select
                              value={item.productTypeId || ""}
                              onValueChange={(value) => handleProductChange(index, "productTypeId", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product type" />
                              </SelectTrigger>
                              <SelectContent>
                                {productTypes.map((type) => (
                                  <SelectItem key={type.id} value={type.id}>
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label>Rate</Label>
                            <Input
                              type="number"
                              value={item.rate || ""}
                              onChange={(e) => handleProductChange(index, "rate", parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        {/* Batches & Quantities */}
                        <div className="grid gap-2">
                          {item.productTypeId && (item.productType?.isService || (item.productType?.hsnNumber && serviceHSNCodes.includes(item.productType.hsnNumber))) ? (
                            <div className="grid gap-2">
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                value={item.batchSelections.length > 0 ? item.batchSelections[0].quantity : 0}
                                onChange={(e) => {
                                  const quantity = parseInt(e.target.value) || 0;
                                  const serviceId = `service_${item.productTypeId}`;
                                  const existingIndex = item.batchSelections.findIndex((b) => b.batchId === serviceId);
                                  if (existingIndex >= 0) {
                                    updateBatchQuantity(item.productTypeId || "", serviceId, quantity);
                                  } else {
                                    addBatchToItem(item.productTypeId || "", serviceId, quantity);
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <Label>Batches & Quantities</Label>
                                <span className="text-sm text-muted-foreground">(Optional)</span>
                              </div>
                              {item.productTypeId && (
                                <div className="grid gap-2">
                                  <div className="flex items-center gap-2">
                                    <Select
                                      onValueChange={(batchId) => {
                                        if (!item.batchSelections.some((b) => b.batchId === batchId)) {
                                          addBatchToItem(item.productTypeId || "", batchId, 0);
                                        }
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select batch" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {productionBatches
                                          .filter((batch) => batch.productType.id === item.productTypeId && batch.remainingQuantity > 0)
                                          .map((batch) => (
                                            <SelectItem key={batch.id} value={batch.id}>
                                              {batch.storageLocation?.name || "Unknown"} ({batch.remainingQuantity} available)
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2 mt-2">
                                    {item.batchSelections.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">No batches selected</p>
                                    ) : (
                                      item.batchSelections.map((selection, batchIndex) => {
                                        const batchDetails = productionBatches.find((b) => b.id === selection.batchId);
                                        return (
                                          <div key={selection.batchId} className="flex items-center gap-2 p-2 border rounded-md">
                                            <div className="flex-1">
                                              <p className="text-sm font-medium">{batchDetails?.storageLocation?.name || selection.batchId}</p>
                                              {batchDetails && (
                                                <p className="text-xs text-muted-foreground">Available: {batchDetails.remainingQuantity}</p>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Input
                                                type="number"
                                                className="w-20"
                                                value={selection.quantity}
                                                onChange={(e) => updateBatchQuantity(item.productTypeId, selection.batchId, parseInt(e.target.value) || 0)}
                                              />
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeBatchFromItem(item.productTypeId, selection.batchId)}
                                                className="h-8 w-8 text-destructive"
                                              >
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProductItem(item.productTypeId)}
                        className="absolute top-2 right-2 h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Card>
                  ))
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-lg mt-2 transition hover:bg-primary/90 active:scale-95"
                onClick={addProductItem}
              >
                <PlusCircle className="h-5 w-5 mr-2" /> Add Product
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                name="remarks"
                placeholder="Additional notes or remarks..."
                value={formData.remarks}
                onChange={handleChange}
                rows={2}
              />
            </div>

            <div className="bg-muted p-4 rounded-md space-y-2">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {formData.isGst && (
                <>
                  <div className="flex justify-between">
                    <span>GST Amount:</span>
                    <span>{formatCurrency(totalTax)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                </>
              )}
            </div>
            {formData.paymentStatus === "PARTIAL" && (
              <div className="space-y-1">
                <label htmlFor="paidAmount" className="text-xs font-medium">Amount Paid</label>
                <Input
                  id="paidAmount"
                  type="number"
                  min={0.01}
                  max={totalAmount - 0.01}
                  step={0.01}
                  value={formData.paidAmount || ""}
                  onChange={e => handlePaidAmountChange(e.target.value)}
                  placeholder="Enter amount paid"
                  className="w-40"
                />
                <div className="text-xs text-muted-foreground">Pending: ₹{(totalAmount - (formData.paidAmount || 0)).toLocaleString()}</div>
              </div>
            )}
          </div>
          {/* Sticky floating footer */}
          <DialogFooter className="sticky bottom-0 bg-background/95 py-4 z-10 border-t flex flex-col md:flex-row gap-2 items-center justify-between mt-6 shadow-lg animate-fade-in">
            <div className="flex-1 text-lg font-bold">
              Total Amount: {formatCurrency(totalAmount)}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !!invoiceError || productGroups.length === 0 || subtotal <= 0 || !isFormModified}
                className="transition hover:bg-primary/90 active:scale-95"
              >
                {isLoading ? "Updating..." : "Update Sale"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
