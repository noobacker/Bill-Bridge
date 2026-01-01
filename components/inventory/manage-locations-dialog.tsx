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
import { Plus, Trash } from "lucide-react"
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

interface StorageLocation {
  id: string
  name: string
  description?: string | null
}

interface ManageLocationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: StorageLocation[]
}

export function ManageLocationsDialog({ open, onOpenChange, locations }: ManageLocationsDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [newLocation, setNewLocation] = useState({
    name: "",
    description: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewLocation((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAddLocation = async () => {
    if (!newLocation.name.trim()) {
      toast({
        title: "Error",
        description: "Location name is required.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/storage-locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newLocation),
      })

      if (!response.ok) {
        throw new Error("Failed to create storage location")
      }

      toast({
        title: "Success",
        description: "Storage location has been added successfully.",
      })

      setNewLocation({
        name: "",
        description: "",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add storage location. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteLocation = async (id: string) => {
    try {
      const response = await fetch(`/api/storage-locations/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete storage location")
      }

      toast({
        title: "Success",
        description: "Storage location has been deleted successfully.",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete storage location. It may be in use.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Storage Locations</DialogTitle>
          <DialogDescription>Add or remove storage locations (Mandi).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-3">
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr,auto] gap-2 items-end">
              <div className="space-y-2">
                <Label htmlFor="name">Location Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Drying Area, Warehouse A"
                  value={newLocation.name}
                  onChange={handleChange}
                />
              </div>
              <Button onClick={handleAddLocation} disabled={isLoading}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Brief description of the location..."
                value={newLocation.description}
                onChange={handleChange}
                rows={2}
              />
            </div>
          </div>

          <div className="border rounded-md p-4 space-y-2">
            <h3 className="font-medium">Existing Locations</h3>
            {locations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No storage locations defined yet.</p>
            ) : (
              <div className="space-y-2">
                {locations.map((location) => (
                  <div key={location.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">{location.name}</p>
                      {location.description && <p className="text-sm text-muted-foreground">{location.description}</p>}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the storage location. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteLocation(location.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
