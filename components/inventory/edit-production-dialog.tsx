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
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "lucide-react"
import { format } from "date-fns"
import { utcToZonedTime } from "date-fns-tz"

interface ProductionBatch {
  id: string
  quantity: number
  remainingQuantity: number
  productionDate: Date
  productType: {
    id: string
    name: string
  }
  storageLocation: {
    id: string
    name: string
  }
}

interface StorageLocation {
  id: string
  name: string
}

interface EditProductionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: ProductionBatch
  storageLocations: StorageLocation[]
}

export function EditProductionDialog({ open, onOpenChange, batch, storageLocations }: EditProductionDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  // Convert production date to IST
  const productionDateIST = utcToZonedTime(new Date(batch.productionDate), 'Asia/Kolkata')
  const formattedDate = format(productionDateIST, 'yyyy-MM-dd')
  
  const [formData, setFormData] = useState({
    productionDate: formattedDate,
    storageLocationId: batch.storageLocation.id,
    remainingQuantity: batch.remainingQuantity,
    notes: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "remainingQuantity" ? Number.parseInt(value) || 0 : value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/production/${batch.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to update production batch")
      }

      toast({
        title: "Success",
        description: "Production batch has been updated successfully.",
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update production batch. Please try again.",
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
          <DialogTitle>Edit Production</DialogTitle>
          <DialogDescription>Update the production batch information.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 py-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label>Product Type</Label>
                <Input value={batch.productType.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>Total Quantity</Label>
                <Input value={batch.quantity} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remainingQuantity">Remaining Quantity</Label>
                <Input
                  id="remainingQuantity"
                  name="remainingQuantity"
                  type="number"
                  min="0"
                  max={batch.quantity}
                  value={formData.remainingQuantity}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productionDate">Production Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="productionDate"
                    name="productionDate"
                    type="date"
                    className="pl-8"
                    value={formData.productionDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="storageLocationId">Storage Location</Label>
                <Select
                  onValueChange={(value) => handleSelectChange("storageLocationId", value)}
                  defaultValue={formData.storageLocationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {storageLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Additional notes about this production batch..."
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Production"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
