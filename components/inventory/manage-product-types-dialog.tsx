"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Edit, Plus, Trash } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Badge } from "@/components/ui/badge"

interface ProductType {
  id: string
  name: string
  hsnNumber: string
  description?: string | null
  isService: boolean
  cgstRate: number
  sgstRate: number
  igstRate: number
}

interface ManageProductTypesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productTypes: ProductType[]
}

export function ManageProductTypesDialog({ open, onOpenChange, productTypes }: ManageProductTypesDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    hsnNumber: "",
    description: "",
    isService: false,
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 0,
  })

  const resetForm = () => {
    setFormData({
      name: "",
      hsnNumber: "",
      description: "",
      isService: false,
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 0,
    })
    setIsEditing(false)
    setSelectedProductId(null)
  }

  const handleSelectForEdit = (product: ProductType) => {
    setIsEditing(true)
    setSelectedProductId(product.id)
    setFormData({
      name: product.name,
      hsnNumber: product.hsnNumber,
      description: product.description || "",
      isService: product.isService,
      cgstRate: product.cgstRate,
      sgstRate: product.sgstRate,
      igstRate: product.igstRate || 0,
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isService: checked,
    }))
  }

  const handleFormSubmit = async () => {
    if (!formData.name.trim() || !formData.hsnNumber.trim()) {
      toast({
        title: "Error",
        description: "Product name and HSN number are required.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    const url = isEditing ? `/api/product-types/${selectedProductId}` : "/api/product-types"
    const method = isEditing ? "PATCH" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} product type`)
      }

      toast({
        title: "Success",
        description: `Product type has been ${isEditing ? 'updated' : 'added'} successfully.`,
      })

      resetForm()
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'add'} product type. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteProductType = async (id: string) => {
    try {
      const response = await fetch(`/api/product-types/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete product type")
      }

      toast({
        title: "Success",
        description: "Product type has been deleted successfully.",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product type. It may be in use.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Product Type" : "Manage Product Types"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details of the existing product type." : "Add or remove product types with HSN numbers and tax rates."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-3">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Fly Ash Bricks"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hsnNumber">HSN Number</Label>
                <Input
                  id="hsnNumber"
                  name="hsnNumber"
                  placeholder="e.g., 6810"
                  value={formData.hsnNumber}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isService" 
                checked={formData.isService}
                onCheckedChange={handleCheckboxChange}
              />
              <Label htmlFor="isService">This is a service (not a physical product)</Label>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cgstRate">CGST Rate (%)</Label>
                <Input
                  id="cgstRate"
                  name="cgstRate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 9"
                  value={formData.cgstRate}
                  onChange={handleNumberChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sgstRate">SGST Rate (%)</Label>
                <Input
                  id="sgstRate"
                  name="sgstRate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 9"
                  value={formData.sgstRate}
                  onChange={handleNumberChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="igstRate">IGST Rate (%)</Label>
                <Input
                  id="igstRate"
                  name="igstRate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 0"
                  value={formData.igstRate}
                  onChange={handleNumberChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Brief description of the product..."
                value={formData.description}
                onChange={handleChange}
                rows={2}
              />
            </div>
            <Button onClick={handleFormSubmit} disabled={isLoading} className="w-full">
              {isEditing ? (
                "Update Product Type"
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product Type
                </>
              )}
            </Button>
            {isEditing && (
              <Button variant="outline" onClick={resetForm} className="w-full">
                Cancel Edit
              </Button>
            )}
          </div>

          <div className="border rounded-md p-4 space-y-2">
            <h3 className="font-medium">Existing Product Types</h3>
            {productTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No product types defined yet.</p>
            ) : (
              <div className="space-y-2">
                {productTypes.map((productType) => (
                  <div key={productType.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{productType.name}</p>
                        {productType.isService && <Badge variant="outline">Service</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">HSN: {productType.hsnNumber}</p>
                      <p className="text-sm text-muted-foreground">Tax: CGST {productType.cgstRate}% + SGST {productType.sgstRate}% + IGST {productType.igstRate || 0}%</p>
                    </div>
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon" onClick={() => handleSelectForEdit(productType)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the product type. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteProductType(productType.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
