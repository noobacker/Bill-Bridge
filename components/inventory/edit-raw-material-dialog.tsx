"use client"

import { useState, useEffect } from "react"
import type { ChangeEvent, FormEvent } from "react"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface RawMaterial {
  id: string
  name: string
  unit: string
  currentStock: number
  minStockLevel: number
  vendorName?: string
  vendorId?: string
}

interface Partner {
  id: string
  name: string
  type: string
}

interface EditRawMaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: RawMaterial
  partners: Partner[]
}

export function EditRawMaterialDialog({ open, onOpenChange, material, partners }: EditRawMaterialDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: material.name,
    unit: material.unit,
    currentStock: material.currentStock,
    minStockLevel: material.minStockLevel,
    vendorId: material.vendorId || '',
  })

  useEffect(() => {
    setFormData({
      name: material.name,
      unit: material.unit,
      currentStock: material.currentStock,
      minStockLevel: material.minStockLevel,
      vendorId: material.vendorId || '',
    });
  }, [material]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "name" || name === "unit" ? value : Number.parseFloat(value) || 0,
    }))
  }

  const handleVendorChange = (value: string) => {
    setFormData((prev) => ({ ...prev, vendorId: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/raw-materials/${material.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to update raw material")
      }

      toast({
        title: "Success",
        description: "Raw material has been updated successfully.",
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update raw material. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Raw Material</DialogTitle>
          <DialogDescription>Update the raw material information.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="currentStock">Current Stock</Label>
                <Input
                  id="currentStock"
                  name="currentStock"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.currentStock}
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
              <div className="space-y-2 col-span-2">
                <Label htmlFor="vendor">Vendor</Label>
                <select
                  id="vendor"
                  name="vendorId"
                  value={formData.vendorId}
                  onChange={(e) => handleVendorChange(e.target.value)}
                  className="w-full border rounded px-2 py-2 h-10"
                >
                  <option value="">Select vendor</option>
                  {partners.filter(p => p.type === 'VENDOR' || p.type === 'BOTH').map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Material"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
