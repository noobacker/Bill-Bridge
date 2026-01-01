"use client"

import type React from "react"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

interface AddPartnerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerType: "VENDOR" | "CLIENT"
}

export function AddPartnerDialog({ open, onOpenChange, partnerType }: AddPartnerDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isBoth, setIsBoth] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    gstNumber: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/partners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          type: isBoth ? "BOTH" : partnerType,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create partner")
      }

      toast({
        title: "Success",
        description: `${partnerType === "VENDOR" ? "Vendor" : "Client"} has been created successfully.`,
      })

      onOpenChange(false)
      setFormData({
        name: "",
        contactName: "",
        phone: "",
        email: "",
        address: "",
        gstNumber: "",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
      })
      setIsBoth(false)
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create ${partnerType === "VENDOR" ? "vendor" : "client"}. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add {partnerType === "VENDOR" ? "Vendor" : "Client"}</DialogTitle>
          <DialogDescription>
            Add a new {partnerType === "VENDOR" ? "vendor" : "client"} to the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="isBoth" checked={isBoth} onCheckedChange={(checked) => setIsBoth(checked === true)} />
              <Label htmlFor="isBoth">
                This {partnerType === "VENDOR" ? "vendor" : "client"} is also a{" "}
                {partnerType === "VENDOR" ? "client" : "vendor"}
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{partnerType === "VENDOR" ? "Vendor" : "Client"} Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={`Enter ${partnerType === "VENDOR" ? "vendor" : "client"} name`}
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Person</Label>
                <Input
                  id="contactName"
                  name="contactName"
                  placeholder="Enter contact person name"
                  value={formData.contactName}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="+91-9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="contact@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  name="gstNumber"
                  placeholder="27ABCDE1234F1Z5"
                  value={formData.gstNumber}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                placeholder="Enter complete address"
                value={formData.address}
                onChange={handleChange}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  placeholder="Enter bank name"
                  value={formData.bankName}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  name="accountNumber"
                  placeholder="Enter account number"
                  value={formData.accountNumber}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifscCode">IFSC Code</Label>
                <Input
                  id="ifscCode"
                  name="ifscCode"
                  placeholder="Enter IFSC code"
                  value={formData.ifscCode}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : `Save ${partnerType === "VENDOR" ? "Vendor" : "Client"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
