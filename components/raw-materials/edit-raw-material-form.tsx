"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface RawMaterial {
  id: string
  name: string
  unit: string
  currentStock: number
  minStockLevel: number
  vendorId?: string
}

interface EditRawMaterialFormProps {
  rawMaterial: RawMaterial
}

export function EditRawMaterialForm({ rawMaterial }: EditRawMaterialFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])
  const [formData, setFormData] = useState({
    name: rawMaterial.name,
    unit: rawMaterial.unit,
    currentStock: rawMaterial.currentStock,
    minStockLevel: rawMaterial.minStockLevel,
    vendorId: rawMaterial.vendorId || "",
  })

  useEffect(() => {
    async function fetchVendors() {
      const res = await fetch("/api/partners")
      if (res.ok) {
        const data = await res.json()
        setVendors(data.filter((v: any) => v.type === "VENDOR"))
      }
    }
    fetchVendors()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "name" || name === "unit" ? value : Number.parseFloat(value) || 0,
    }))
  }

  const handleVendorChange = (value: string) => {
    setFormData((prev) => ({ ...prev, vendorId: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/raw-materials/${rawMaterial.id}`, {
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

      router.push("/dashboard/raw-materials")
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
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <div className="flex items-center">
            <Link href="/dashboard/raw-materials" className="mr-4">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            </Link>
            <div>
              <CardTitle>Edit Material Details</CardTitle>
              <CardDescription>Update the raw material information.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            <div className="space-y-2">
              <Label htmlFor="vendorId">Vendor</Label>
              <Select value={formData.vendorId} onValueChange={handleVendorChange}>
                <SelectTrigger id="vendorId">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Link href="/dashboard/raw-materials">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Material"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
