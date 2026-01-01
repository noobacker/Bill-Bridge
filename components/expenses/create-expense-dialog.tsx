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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Plus } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"

interface ExpenseCategory {
  id: string
  name: string
}

interface Partner {
  id: string
  name: string
}

interface RawMaterial {
  id: string
  name: string
}

interface CreateExpenseDialogProps {
  categories: ExpenseCategory[]
  partners: Partner[]
  rawMaterials: RawMaterial[]
}

export function CreateExpenseDialog({ categories, partners, rawMaterials }: CreateExpenseDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    categoryId: "",
    description: "",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    partnerId: "",
    rawMaterialId: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? Number.parseFloat(value) || 0 : value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // If category changes to "Raw Material", reset partner and rawMaterial
    if (name === "categoryId") {
      const category = categories.find((c) => c.id === value)
      if (category?.name !== "Raw Material") {
        setFormData((prev) => ({
          ...prev,
          partnerId: "",
          rawMaterialId: "",
        }))
      }
    }
  }

  const selectedCategory = categories.find((c) => c.id === formData.categoryId)
  const isRawMaterialCategory = selectedCategory?.name === "Raw Material"
  const isOtherCategory = selectedCategory?.name === "Other"

  // Convert string date to Date object for DatePicker
  const expenseDate = formData.date ? new Date(formData.date) : new Date()
  
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData({
        ...formData,
        date: date.toISOString().split("T")[0]
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate description for "Other" category
    if (isOtherCategory && !formData.description.trim()) {
      toast({
        title: "Error",
        description: "Description is required for 'Other' expense category.",
        variant: "destructive",
      })
      return
    }

    // Validate vendor and raw material for "Raw Material" category
    if (isRawMaterialCategory && (!formData.partnerId || !formData.rawMaterialId)) {
      toast({
        title: "Error",
        description: "Vendor and raw material are required for 'Raw Material' expense category.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to create expense")
      }

      toast({
        title: "Success",
        description: "Expense has been recorded successfully.",
      })

      setOpen(false)
      setFormData({
        categoryId: "",
        description: "",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        partnerId: "",
        rawMaterialId: "",
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record expense. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>Record a new business expense.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category *</Label>
                <Select onValueChange={(value) => handleSelectChange("categoryId", value)} value={formData.categoryId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount || ""}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <DatePicker
                date={expenseDate}
                setDate={handleDateChange}
                placeholder="Select expense date"
              />
            </div>

            {isRawMaterialCategory && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="partnerId">Vendor *</Label>
                  <Select
                    onValueChange={(value) => handleSelectChange("partnerId", value)}
                    required={isRawMaterialCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
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
                  <Label htmlFor="rawMaterialId">Raw Material *</Label>
                  <Select
                    onValueChange={(value) => handleSelectChange("rawMaterialId", value)}
                    required={isRawMaterialCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description {isOtherCategory ? "*" : "(Optional)"}</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter expense description..."
                value={formData.description}
                onChange={handleChange}
                rows={3}
                required={isOtherCategory}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Recording..." : "Record Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
