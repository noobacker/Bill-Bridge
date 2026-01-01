"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

export function BillSettings() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    cgstRate: 9,
    sgstRate: 9,
    defaultBrickPrice: 4.5,
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings")
        if (response.ok) {
          const data = await response.json()
          setFormData({
            cgstRate: data.cgstRate,
            sgstRate: data.sgstRate,
            defaultBrickPrice: data.defaultBrickPrice,
          })
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error)
      }
    }

    fetchSettings()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: Number.parseFloat(value) || 0,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to update settings")
      }

      toast({
        title: "Success",
        description: "Bill settings have been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update bill settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bill Settings</CardTitle>
        <CardDescription>Configure GST rates and default pricing for invoices.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cgstRate">CGST Rate (%)</Label>
              <Input
                id="cgstRate"
                name="cgstRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.cgstRate}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sgstRate">SGST Rate (%)</Label>
              <Input
                id="sgstRate"
                name="sgstRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.sgstRate}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalGst">Total GST Rate (%)</Label>
              <Input id="totalGst" type="number" value={formData.cgstRate + formData.sgstRate} disabled />
              <p className="text-xs text-muted-foreground">Sum of CGST and SGST rates</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultBrickPrice">Default Brick Price (₹)</Label>
              <Input
                id="defaultBrickPrice"
                name="defaultBrickPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.defaultBrickPrice}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-muted-foreground">Used when price is not specified during sales</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
