"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import Cropper from 'react-easy-crop'
import { useRef } from 'react'
import getCroppedImg from '@/lib/cropImage'

export function CompanySettings() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    gstNumber: "",
    panNumber: "",
    bankName: "",
    accountNumber: "",
    accountHolderName: "",
    ifscCode: "",
    upiId: "",
    pdfFormat: "modern", // Add this line
    // showLogoInPdf removed
  })
  const [logoUrl, setLogoUrl] = useState<string>("/images/default_logo.png");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) return
        const data = await res.json()
        setFormData({
          name: data.companyName || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          gstNumber: data.gstNumber || '',
          panNumber: data.panNumber || '',
          bankName: data.bankName || '',
          accountNumber: data.accountNumber || '',
          accountHolderName: data.accountHolderName || '',
          ifscCode: data.ifscCode || '',
          upiId: data.upiId || '',
          pdfFormat: data.pdfFormat || 'modern', // Add this line
          // showLogoInPdf removed
        })
        setLogoUrl(data.logoUrl || "/images/default_logo.png");
      } catch {}
    }
    fetchSettings()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Failed to update settings')
      const updated = await res.json()
      setFormData({
        name: updated.companyName || '',
        address: updated.address || '',
        phone: updated.phone || '',
        email: updated.email || '',
        gstNumber: updated.gstNumber || '',
        panNumber: updated.panNumber || '',
        bankName: updated.bankName || '',
        accountNumber: updated.accountNumber || '',
        accountHolderName: updated.accountHolderName || '',
        ifscCode: updated.ifscCode || '',
        upiId: updated.upiId || '',
        pdfFormat: updated.pdfFormat || 'modern', // Add this line
        // showLogoInPdf removed
      })
      toast({
        title: "Success",
        description: "Company settings have been updated successfully.",
      })
      // Dispatch event for sidebar update
      window.dispatchEvent(new CustomEvent('companyNameUpdated'))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update company settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Cropping UI state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropShape, setCropShape] = useState<'rect' | 'round'>('rect');
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    setShowCropper(true);
  };

  const onCropComplete = (_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    if (!selectedImage || !croppedAreaPixels) return;
    setIsLoading(true);
    try {
      const croppedBlob = await getCroppedImg(selectedImage, croppedAreaPixels, cropShape);
      const formData = new FormData();
      formData.append('logo', croppedBlob, 'logo.png');
      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload logo');
      const data = await res.json();
      setLogoUrl(data.logoUrl);
      setCroppedImage(URL.createObjectURL(croppedBlob));
      setShowCropper(false);
      setSelectedImage(null);
      toast({ title: 'Logo updated', description: 'Company logo updated successfully.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload logo.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedImage(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
        <CardDescription>Update your company details and business information.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input id="gstNumber" name="gstNumber" value={formData.gstNumber} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input id="panNumber" name="panNumber" value={formData.panNumber} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input id="bankName" name="bankName" value={formData.bankName} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input id="accountNumber" name="accountNumber" value={formData.accountNumber} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountHolderName">Account Holder Name</Label>
              <Input id="accountHolderName" name="accountHolderName" value={formData.accountHolderName} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifscCode">IFSC Code</Label>
              <Input id="ifscCode" name="ifscCode" value={formData.ifscCode} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input id="upiId" name="upiId" value={formData.upiId} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdfFormat">Invoice PDF Format</Label>
              <select
                id="pdfFormat"
                name="pdfFormat"
                value={formData.pdfFormat}
                onChange={handleSelectChange}
                className="w-full border rounded px-2 py-1 bg-background"
              >
                <option value="modern">Modern (Default)</option>
                <option value="box">Box/Official</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                <img src={croppedImage || logoUrl} alt="Company Logo" className={`h-16 w-16 object-contain border bg-white ${cropShape === 'round' ? 'rounded-full' : 'rounded'}`} />
                <input ref={inputFileRef} type="file" accept="image/*" onChange={handleLogoChange} disabled={isLoading} />
                <Button type="button" variant="outline" size="sm" onClick={async () => {
                  setIsLoading(true);
                  try {
                    const res = await fetch('/api/settings/logo', { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to remove logo');
                    setLogoUrl('/images/default_logo.png');
                    setCroppedImage(null);
                    toast({ title: 'Logo removed', description: 'Default logo restored.' });
                  } catch {
                    toast({ title: 'Error', description: 'Failed to remove logo.', variant: 'destructive' });
                  } finally {
                    setIsLoading(false);
                  }
                }}>Remove Logo</Button>
              </div>
              {showCropper && selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                  <div className="bg-white p-4 rounded shadow-lg flex flex-col items-center">
                    <div className="w-72 h-72 relative">
                      <Cropper
                        image={URL.createObjectURL(selectedImage)}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape={cropShape}
                        showGrid={true}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                      />
                    </div>
                    <div className="flex gap-4 mt-4 items-center">
                      <Label>Zoom</Label>
                      <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} />
                      <Label>Shape</Label>
                      <select value={cropShape} onChange={e => setCropShape(e.target.value as 'rect' | 'round')} className="border rounded px-2 py-1">
                        <option value="rect">Square</option>
                        <option value="round">Circle</option>
                      </select>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button type="button" onClick={handleCropSave} disabled={isLoading}>Save</Button>
                      <Button type="button" variant="outline" onClick={handleCropCancel}>Cancel</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" value={formData.address} onChange={handleChange} rows={3} />
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
