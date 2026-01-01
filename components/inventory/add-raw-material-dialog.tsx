"use client"

import type React from "react"

import { useState } from "react"
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
import { format } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import { Tabs } from "@/components/ui/tabs"

interface Partner {
  id: string
  name: string
  type: string
}

interface AddRawMaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partners: Partner[]
  rawMaterials: { id: string; name: string; unit: string; vendorName?: string }[]
}

export function AddRawMaterialDialog({ open, onOpenChange, partners, rawMaterials }: AddRawMaterialDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("")
  
  // Get current date in IST timezone
  const today = utcToZonedTime(new Date(), 'Asia/Kolkata')
  const formattedDate = format(today, 'yyyy-MM-dd')
  
  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    currentStock: 0,
    minStockLevel: 0,
    partnerId: "",
    billNumber: "",
    purchaseAmount: 0,
    quantity: 0,
    inventoryDate: formattedDate,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "name" || name === "unit" ? value : Number.parseFloat(value) || 0,
    }))
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, inventoryDate: e.target.value }))
  }

  const handlePartnerChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      partnerId: value,
    }))
  }

  const handleMaterialChange = (value: string) => {
    setSelectedMaterialId(value)
    const mat = rawMaterials.find((m) => m.id === value)
    if (mat) {
      setFormData((prev) => ({ ...prev, name: mat.name, unit: mat.unit }))
    }
  }

  const handleModeChange = (value: 'existing' | 'new') => {
    setMode(value)
    setSelectedMaterialId("")
    setFormData({
      name: "",
      unit: "",
      currentStock: 0,
      minStockLevel: 0,
      partnerId: "",
      billNumber: "",
      purchaseAmount: 0,
      quantity: 0,
      inventoryDate: formattedDate,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.purchaseAmount || formData.purchaseAmount <= 0) {
      toast({
        title: "Error",
        description: "Price is required and must be greater than zero.",
        variant: "destructive",
      })
      return
    }
    setIsLoading(true)

    try {
      let payload: any = { ...formData }
      payload.inventoryDate = formData.inventoryDate
      if (mode === 'existing') {
        payload.materialId = selectedMaterialId
        payload.mode = 'existing'
      } else {
        payload.mode = 'new'
      }
      const response = await fetch("/api/raw-materials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Failed to add inventory")
      }

      toast({
        title: "Success",
        description: mode === 'existing' ? "Inventory updated successfully." : "Raw material has been created successfully.",
      })

      onOpenChange(false)
      setFormData({
        name: "",
        unit: "",
        currentStock: 0,
        minStockLevel: 0,
        partnerId: "",
        billNumber: "",
        billNumber: "",
        purchaseAmount: 0,
        quantity: 0,
        inventoryDate: formattedDate,
      })
      setSelectedMaterialId("")
      setMode('existing')
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add inventory. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Raw Material Inventory</DialogTitle>
          <DialogDescription>Add to existing or create new raw material in inventory.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mb-2">
          <Button variant={mode === 'existing' ? 'default' : 'outline'} onClick={() => handleModeChange('existing')}>Add to Existing</Button>
          <Button variant={mode === 'new' ? 'default' : 'outline'} onClick={() => handleModeChange('new')}>Add New</Button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 py-3">
            <div className="grid grid-cols-2 gap-3">
              {mode === 'existing' ? (
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="materialId">Select Material</Label>
                  <Select value={selectedMaterialId} onValueChange={handleMaterialChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map((mat) => (
                        <SelectItem key={mat.id} value={mat.id}>{mat.name} - {mat.unit} - {mat.vendorName || '-'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Material Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., Cement, Fly Ash, Sand"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit of Measurement</Label>
                    <Input
                      id="unit"
                      name="unit"
                      placeholder="e.g., kg, ton, bag"
                      value={formData.unit}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStockLevel">Minimum Stock Level</Label>
                    <Input
                      id="minStockLevel"
                      name="minStockLevel"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.minStockLevel}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchaseAmount">Purchase Amount</Label>
                <Input
                  id="purchaseAmount"
                  name="purchaseAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.purchaseAmount}
                  onChange={handleChange}
                  required
                  className="ring-2 ring-blue-400 focus:ring-4 focus:ring-blue-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billNumber">Purchase/Invoice # (optional)</Label>
                <Input
                  id="billNumber"
                  name="billNumber"
                  placeholder="e.g., 123, ABC-2025"
                  value={formData.billNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, billNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventoryDate">Inventory Date</Label>
                <Input
                  id="inventoryDate"
                  name="inventoryDate"
                  type="date"
                  value={formData.inventoryDate}
                  onChange={handleDateChange}
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Select value={formData.partnerId} onValueChange={handlePartnerChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.filter(p => p.type === 'VENDOR' || p.type === 'BOTH').map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.purchaseAmount || formData.purchaseAmount <= 0}>
              {isLoading ? (mode === 'existing' ? "Updating..." : "Saving...") : (mode === 'existing' ? "Add to Inventory" : "Save Material")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
