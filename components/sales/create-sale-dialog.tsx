"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Plus, Trash2, AlertCircle, XIcon, Info } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Partner, ProductType, ProductionBatch, BatchSelection, MultiProductSaleFormData, SaleItem } from "./types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { DatePicker } from "@/components/ui/date-picker"
import { useRef } from "react"
import confetti from "canvas-confetti"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TransportationCombobox } from "./TransportationCombobox"
import { DriverCombobox } from "./DriverCombobox"

interface CreateSaleDialogProps {
  partners: Partner[]
  productTypes: ProductType[]
  productionBatches: ProductionBatch[]
  lastInvoiceNumber: string
  cgstRate: number
  sgstRate: number
  igstRate: number
  defaultBrickPrice: number
}

const serviceHSNCodes = ["998513", "996511", "998519"]; // HSN codes for services

export function CreateSaleDialog({
  partners,
  productTypes,
  productionBatches,
  lastInvoiceNumber,
  cgstRate,
  sgstRate,
  igstRate,
  defaultBrickPrice,
}: CreateSaleDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [invoiceError, setInvoiceError] = useState("")
  const [quantityError, setQuantityError] = useState("")
  const [isCheckingInvoice, setIsCheckingInvoice] = useState(false)
  const confettiRef = useRef<HTMLDivElement>(null)
  const [transportationOptions, setTransportationOptions] = useState<{ id: string, name: string }[]>([])
  const [transportationInput, setTransportationInput] = useState("")
  const [selectedTransportation, setSelectedTransportation] = useState<{ id: string, name: string } | null>(null)
  const [isTransportLoading, setIsTransportLoading] = useState(false)
  const [driverOptions, setDriverOptions] = useState<{ name: string; phone: string }[]>([])
  const [selectedDriver, setSelectedDriver] = useState<{ name: string; phone: string } | null>(null)
  const [customDriver, setCustomDriver] = useState<{ name: string; phone: string }>({ name: "", phone: "" })
  const [showCustomDriver, setShowCustomDriver] = useState(false)
  const [addDriverModalOpen, setAddDriverModalOpen] = useState(false)
  const [addDriverFields, setAddDriverFields] = useState({ name: "", phone: "" })
  const [addDriverLoading, setAddDriverLoading] = useState(false)
  const [addDriverError, setAddDriverError] = useState("")

  useEffect(() => {
    // Fetch transportation options from backend
    fetch("/api/transportation")
      .then(res => res.json())
      .then(data => setTransportationOptions(data.map((t: any) => ({ id: t.id, name: t.name }))))
  }, [])

  useEffect(() => {
    if (selectedTransportation && selectedTransportation.id) {
      fetch(`/api/transportation/${selectedTransportation.id}`)
        .then(res => res.json())
        .then(data => setDriverOptions(Array.isArray(data.drivers) ? data.drivers : []))
    } else {
      setDriverOptions([])
    }
    setSelectedDriver(null)
    setShowCustomDriver(false)
    setCustomDriver({ name: "", phone: "" })
  }, [selectedTransportation])

  const handleTransportationChange = async (value: string) => {
    setTransportationInput(value)
    // If value matches an existing option, select it
    const existing = transportationOptions.find(t => t.name.toLowerCase() === value.toLowerCase())
    if (existing) {
      setSelectedTransportation(existing)
      return
    }
    // If not, allow free text and set as new
    setSelectedTransportation(null)
  }

  const handleTransportationBlur = async () => {
    // If input is not empty and not in options, create it
    if (
      transportationInput.trim() &&
      !transportationOptions.some(t => t.name.toLowerCase() === transportationInput.trim().toLowerCase())
    ) {
      setIsTransportLoading(true)
      try {
        const res = await fetch("/api/transportation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: transportationInput.trim(), phone: "", city: "", ownerName: "" }),
        })
        if (!res.ok) throw new Error(await res.text())
        const newTransport = await res.json()
        setTransportationOptions(prev => [...prev, { id: newTransport.id, name: newTransport.name }])
        setSelectedTransportation({ id: newTransport.id, name: newTransport.name })
        toast({ title: "Transportation added", description: newTransport.name })
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to add transportation.", variant: "destructive" })
      } finally {
        setIsTransportLoading(false)
      }
    }
  }

  // Generate next invoice number
  const getNextInvoiceNumber = () => {
    const prefix = "INV-"
    const currentNumber = Number.parseInt(lastInvoiceNumber.replace(prefix, ""))
    const nextNumber = currentNumber + 1
    return `${prefix}${nextNumber.toString().padStart(4, "0")}`
  }

  const [formData, setFormData] = useState<MultiProductSaleFormData>({
    invoiceNumber: getNextInvoiceNumber(),
    partnerId: "",
    invoiceDate: new Date().toISOString(),
    isGst: true,
    paymentType: "CASH",
    paymentStatus: "PENDING",
    paidAmount: 0,
    remarks: "",
    transportVehicle: "",
    deliveryCity: "",
    items: [],
  })

  // Convert string date to Date object for DatePicker
  const invoiceDate = formData.invoiceDate ? new Date(formData.invoiceDate) : new Date()
  
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData({
        ...formData,
        invoiceDate: date.toISOString()
      })
    }
  }

  // --- START: Multi-product logic ---

  // Add a new product item to the form
  const addProductItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: crypto.randomUUID(),
          productTypeId: "",
          rate: defaultBrickPrice,
          batchSelections: [],
        },
      ],
    }))
  }

  // Remove a product item
  const removeProductItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
    }))
  }

  // Handle changes for a specific product item
  const handleItemChange = (itemId: string, field: keyof SaleItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          // If product type changes, reset its batches
          if (field === 'productTypeId') {
              updatedItem.batchSelections = [];
          }
          return updatedItem;
        }
        return item
      }),
    }))
  }

  // Add a batch to a specific product item
  const addBatchToItem = (itemId: string, batchId: string) => {
    const batch = productionBatches.find(b => b.id === batchId)
    if (!batch) return

    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          // Check if batch is already selected for this item
          if (item.batchSelections.some(bs => bs.batchId === batchId)) {
            toast({
              title: "Batch already selected",
              description: "This batch is already in the list for this product.",
              variant: "destructive",
            })
            return item
          }
          const newBatchSelection: BatchSelection = {
            batchId,
            quantity: 0,
            locationName: batch.storageLocation?.name || "Unknown",
            availableQuantity: batch.remainingQuantity,
          }
          return { ...item, batchSelections: [...item.batchSelections, newBatchSelection] }
        }
        return item
      }),
    }))
  }

  // Remove a batch from a product item
  const removeBatchFromItem = (itemId: string, batchId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          return { ...item, batchSelections: item.batchSelections.filter(bs => bs.batchId !== batchId) }
        }
        return item
      }),
    }))
  }

  // Update a batch quantity for a product item
  const updateBatchQuantity = (itemId: string, batchId: string, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            batchSelections: item.batchSelections.map(bs =>
              bs.batchId === batchId ? { ...bs, quantity } : bs
            ),
          }
        }
        return item
      }),
    }))
  }

  // --- END: Multi-product logic ---

  // --- START: Calculation logic updates ---
  const { totalQuantity, subtotal, totalTax, totalAmount } = useMemo(() => {
    let totalQuantity = 0;
    let subtotal = 0;
    let totalTax = 0;
    let totalAmount = 0;

    formData.items.forEach(item => {
      const itemQuantity = item.batchSelections.reduce((sum, sel) => sum + sel.quantity, 0);
      const itemAmount = itemQuantity * item.rate;
      
      const productType = productTypes.find(pt => pt.id === item.productTypeId);
      const cgst = productType?.cgstRate ?? cgstRate;
      const sgst = productType?.sgstRate ?? sgstRate;
      const igst = productType?.igstRate ?? igstRate;
      
      const itemCgstAmount = formData.isGst ? (itemAmount * cgst / 100) : 0;
      const itemSgstAmount = formData.isGst ? (itemAmount * sgst / 100) : 0;
      const itemIgstAmount = formData.isGst ? (itemAmount * igst / 100) : 0;
      const itemTax = itemCgstAmount + itemSgstAmount + itemIgstAmount;
      
      totalQuantity += itemQuantity;
      subtotal += itemAmount;
      totalTax += itemTax;
      totalAmount += itemAmount + itemTax;
    });

    return { totalQuantity, subtotal, totalTax, totalAmount };
  }, [formData.items, formData.isGst, productTypes, cgstRate, sgstRate, igstRate]);
  // --- END: Calculation logic updates ---

  // Check if invoice number already exists
  const checkInvoiceNumber = async (invoiceNumber: string) => {
    if (!invoiceNumber.trim()) return false;
    
    setIsCheckingInvoice(true);
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
    } finally {
      setIsCheckingInvoice(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === "invoiceNumber") {
      setInvoiceError("");
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleInvoiceBlur = async () => {
    await checkInvoiceNumber(formData.invoiceNumber);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleGstChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      isGst: value === "true",
    }))
  }

  const handlePaymentTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, paymentType: value }))
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

  const validateForm = (): boolean => {
    if (!formData.invoiceNumber.trim()) {
      toast({ title: "Validation Error", description: "Invoice number is required.", variant: "destructive" });
      return false;
    }
    if (!formData.partnerId) {
      toast({ title: "Validation Error", description: "Please select a client.", variant: "destructive" });
      return false;
    }
    if (formData.items.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one product.", variant: "destructive" });
      return false;
    }

    for (const item of formData.items) {
      const productType = productTypes.find(p => p.id === item.productTypeId)
      
      if (!item.productTypeId) {
        toast({ title: "Validation Error", description: `Please select a product for all items.`, variant: "destructive" });
        return false;
      }
      if (item.rate <= 0) {
        toast({ title: "Validation Error", description: `Rate must be positive for ${productType?.name}.`, variant: "destructive" });
        return false;
      }
      
      // Skip batch validation - batches are now optional
      
      // If batches are selected, validate their quantities
      if (item.batchSelections.length > 0) {
        const totalQuantity = item.batchSelections.reduce((sum, sel) => sum + sel.quantity, 0);
        if (totalQuantity <= 0) {
          toast({ 
            title: "Validation Error", 
            description: `If batches are selected, total quantity must be greater than 0 for ${productType?.name}.`, 
            variant: "destructive" 
          });
          return false;
        }

        // Only validate available stock if not a service
        if (!productType?.isService) {
          for (const selection of item.batchSelections) {
            if (selection.quantity > selection.availableQuantity) {
              toast({
                title: "Validation Error",
                description: `Quantity for a batch cannot exceed available stock for ${productType?.name}.`,
                variant: "destructive",
              });
              return false;
            }
          }
        }
      }
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const invoiceExists = await checkInvoiceNumber(formData.invoiceNumber);
    if (invoiceExists) {
        toast({
            title: "Invoice Error",
            description: `Invoice number ${formData.invoiceNumber} already exists.`,
            variant: "destructive",
        });
        return;
    }

    setIsLoading(true)

    const { cgst, sgst } = formData.items.reduce(
      (acc, item) => {
        const itemQuantity = item.batchSelections.reduce((sum, sel) => sum + sel.quantity, 0)
        const itemAmount = itemQuantity * item.rate
        const productType = productTypes.find(p => p.id === item.productTypeId)
        const itemCgstRate = productType?.cgstRate ?? cgstRate
        const itemSgstRate = productType?.sgstRate ?? sgstRate
        const itemCgst = formData.isGst ? (itemAmount * itemCgstRate) / 100 : 0
        const itemSgst = formData.isGst ? (itemAmount * itemSgstRate) / 100 : 0
        acc.cgst += itemCgst
        acc.sgst += itemSgst
        return acc
      },
      { cgst: 0, sgst: 0 }
    )

    const driverName = showCustomDriver ? customDriver.name : selectedDriver?.name
    const driverPhone = showCustomDriver ? customDriver.phone : selectedDriver?.phone

    try {
      const response = await fetch("/api/sales/multi-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          paidAmount: formData.paymentStatus === "COMPLETE" ? totalAmount : formData.paymentStatus === "PENDING" ? 0 : formData.paidAmount,
          pendingAmount: formData.paymentStatus === "COMPLETE" ? 0 : formData.paymentStatus === "PENDING" ? totalAmount : totalAmount - (formData.paidAmount || 0),
          paymentStatus: formData.paymentStatus,
          invoiceDate: formData.invoiceDate ? formData.invoiceDate.split('T')[0] : '',
          subtotal,
          cgstAmount: cgst,
          sgstAmount: sgst,
          totalAmount,
          transportationId: selectedTransportation?.id,
          driverName: driverName || undefined,
          driverPhone: driverPhone || undefined,
          transportVehicle: formData.transportVehicle,
          deliveryCity: formData.deliveryCity,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || "Failed to create sale")
      }

      toast({
        title: "Sale Created",
        description: "The new sale has been successfully recorded.",
      })
      // Confetti burst
      if (confettiRef.current) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        })
      }
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Sale
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Sale</DialogTitle>
          <DialogDescription>Record a new sale and generate an invoice.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                  onBlur={handleInvoiceBlur}
                  className={invoiceError ? "border-red-500" : ""}
                  required
                />
                {invoiceError && (
                  <Alert variant="destructive" className="py-2 mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{invoiceError}</AlertDescription>
                  </Alert>
                )}
                <p className="text-xs text-muted-foreground">Last: {lastInvoiceNumber}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <DatePicker
                  date={invoiceDate}
                  setDate={handleDateChange}
                  placeholder="Select invoice date"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partnerId">Client</Label>
                <Select onValueChange={(value) => handleSelectChange("partnerId", value)} required>
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
                  defaultValue="true"
                  className="flex items-center space-x-2"
                  onValueChange={handleGstChange}
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="true" id="gst-yes" />
                    <Label htmlFor="gst-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="false" id="gst-no" />
                    <Label htmlFor="gst-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Separator />

            {/* Products Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2 sticky top-0 z-10 bg-background/95 py-2 shadow-sm">
                <h3 className="text-lg font-semibold tracking-tight">Products</h3>
              </div>
              <div className="space-y-6">
                {formData.items.length === 0 ? (
                  renderEmptyState()
                ) : (
                  formData.items.map((item, index) => {
                    const productType = productTypes.find((p) => p.id === item.productTypeId)
                    const isService = productType?.isService || (productType?.hsnNumber && serviceHSNCodes.includes(productType.hsnNumber));
                    const filteredBatches = productionBatches.filter((batch) => batch.productType.id === item.productTypeId && batch.remainingQuantity > 0);
                    const selectedBatches = new Set(item.batchSelections.map(bs => bs.batchId));
                    return (
                      <Card key={item.id} className="relative overflow-hidden animate-fade-in">
                        {/* Animated accent bar */}
                        <div className="absolute left-0 top-0 h-full w-1 bg-blue-500 transition-all duration-700 animate-grow-bar" />
                        <CardHeader className="p-2">
                          <CardTitle className="text-lg">Product #{index + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Product Type</Label>
                              <Select
                                value={item.productTypeId}
                                onValueChange={(value) => handleItemChange(item.id, "productTypeId", value)}
                                required
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {productTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.id}>
                                      {type.name} (HSN: {type.hsnNumber})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Rate per Unit (₹)</Label>
                              <Input
                                type="number"
                                value={item.rate}
                                onChange={(e) => handleItemChange(item.id, "rate", parseFloat(e.target.value) || 0)}
                                required
                              />
                            </div>
                          </div>
                          
                          {isService ? (
                            <div className="space-y-2">
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                placeholder="Enter quantity"
                                min="1"
                                value={item.batchSelections[0]?.quantity || ""}
                                onChange={(e) => {
                                  const quantity = parseInt(e.target.value, 10) || 0;
                                  
                                  // If there are no batch selections yet, create one
                                  if (item.batchSelections.length === 0) {
                                    handleItemChange(item.id, "batchSelections", [
                                      {
                                        batchId: `service_${item.id}`,
                                        quantity,
                                        locationName: "Service",
                                        availableQuantity: Infinity,
                                      }
                                    ]);
                                  } 
                                  // Otherwise update the existing one
                                  else {
                                    updateBatchQuantity(
                                      item.id,
                                      item.batchSelections[0].batchId,
                                      quantity
                                    );
                                  }
                                }}
                                required
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Label>Batches</Label>
                                <Info className="h-5 w-5 text-blue-500" />
                              </div>
                              <div className="text-xs text-muted-foreground mb-1">
                                Select a batch and enter the quantity to allocate stock for this product.
                              </div>
                              <Select
                                onValueChange={(batchId) => addBatchToItem(item.id, batchId)}
                                disabled={!item.productTypeId}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Add batch" />
                                </SelectTrigger>
                                <SelectContent>
                                  {filteredBatches.map((batch) => (
                                    <SelectItem key={batch.id} value={batch.id}>
                                      {batch.storageLocation?.name || "Unknown"} ({batch.remainingQuantity})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="space-y-2 pt-2">
                                {item.batchSelections.length === 0 ? (
                                  <div className="text-xs text-muted-foreground italic">No batches selected. Choose a batch to allocate stock.</div>
                                ) : (
                                  item.batchSelections.map((selection) => (
                                    <div
                                      key={selection.batchId}
                                      className="flex items-center gap-3 bg-muted/60 border rounded-lg px-3 py-2 shadow-sm"
                                    >
                                      <div className="flex-1 font-medium">
                                        {selection.locationName} <span className="text-xs text-muted-foreground">(Available: {selection.availableQuantity})</span>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <Label htmlFor={`qty-${item.id}-${selection.batchId}`} className="text-xs mb-0.5">Qty</Label>
                                        <Input
                                          id={`qty-${item.id}-${selection.batchId}`}
                                          type="number"
                                          className="h-10 w-20 text-right"
                                          placeholder="Qty"
                                          max={selection.availableQuantity}
                                          min="0"
                                          value={selection.quantity}
                                          onChange={(e) =>
                                            updateBatchQuantity(
                                              item.id,
                                              selection.batchId,
                                              parseInt(e.target.value) || 0
                                            )
                                          }
                                        />
                                        {selection.quantity > selection.availableQuantity && (
                                          <span className="text-xs text-red-500">Exceeds available</span>
                                        )}
                                      </div>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => removeBatchFromItem(item.id, selection.batchId)}
                                              className="ml-2 text-destructive"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Remove batch</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => removeProductItem(item.id)}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </Card>
                    )
                  })
                )}
              </div>
              <Button type="button" variant="outline" onClick={addProductItem} className="w-full rounded-lg mt-2 transition hover:bg-primary/90 active:scale-95">
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </div>
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transportation">Transportation</Label>
                <TransportationCombobox
                  options={transportationOptions}
                  value={selectedTransportation}
                  onChange={setSelectedTransportation}
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
                      toast({ title: "Transportation added", description: newTransport.name })
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
                      // Fetch the current transport to get all required fields
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
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <RadioGroup
                  value={formData.paymentStatus}
                  onValueChange={handlePaymentStatusChange}
                  className="flex items-center space-x-2"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="COMPLETE" id="payment-status-complete" />
                    <Label htmlFor="payment-status-complete">Paid</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="PARTIAL" id="payment-status-partial" />
                    <Label htmlFor="payment-status-partial">Partial Paid</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="PENDING" id="payment-status-pending" />
                    <Label htmlFor="payment-status-pending">Credit/Pending</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <RadioGroup
                  defaultValue={formData.paymentType}
                  className="flex items-center space-x-2"
                  onValueChange={handlePaymentTypeChange}
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="CASH" id="payment-cash" />
                    <Label htmlFor="payment-cash">Cash</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="ONLINE" id="payment-online" />
                    <Label htmlFor="payment-online">Online</Label>
                  </div>
                </RadioGroup>
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
              <div className="md:col-span-2 space-y-2">
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
            </div>
          </div>
          <div className="bg-muted p-4 rounded-md space-y-2 mt-4">
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
          <DialogFooter className="sticky bottom-0 bg-background/95 py-4 z-10 border-t flex flex-col md:flex-row gap-2 items-center justify-between mt-6 shadow-lg animate-fade-in">
            <div className="flex-1 text-lg font-bold">
              Total Amount: {formatCurrency(totalAmount)}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="transition hover:bg-primary/90 active:scale-95">
                {isLoading ? "Creating Sale..." : "Create Sale"}
              </Button>
            </div>
          </DialogFooter>
          {/* Confetti anchor */}
          <div ref={confettiRef} />
        </form>
      </DialogContent>
    </Dialog>
  )
}
