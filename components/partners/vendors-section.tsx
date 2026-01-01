"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Edit, Eye, Phone, Plus, Search, Trash } from "lucide-react"
import { AddPartnerDialog } from "./add-partner-dialog"
import { ViewPartnerDialog } from "./view-partner-dialog"
import { EditPartnerDialog } from "./edit-partner-dialog"
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
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

interface Partner {
  id: string
  name: string
  contactName?: string | null
  phone?: string | null
  email?: string | null
  gstNumber?: string | null
  type: string
  _count: {
    purchases: number
  }
}

interface VendorsSectionProps {
  vendors: Partner[]
}

export function VendorsSection({ vendors }: VendorsSectionProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.phone?.includes(searchTerm) ||
      vendor.gstNumber?.includes(searchTerm),
  )

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/partners/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete partner")
      }

      toast({
        title: "Success",
        description: "Partner has been deleted successfully.",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete partner. It may be in use.",
        variant: "destructive",
      })
    }
  }

  const handleCall = (phone?: string | null) => {
    if (phone) {
      window.location.href = `tel:${phone}`
    } else {
      toast({ title: "No contact number found." })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search vendors..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>GST Number</TableHead>
              <TableHead>Purchases</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No vendors found.
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>{vendor.contactName || "-"}</TableCell>
                  <TableCell>
                    {vendor.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {vendor.phone}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{vendor.gstNumber || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{vendor._count.purchases}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCall(vendor.phone)}
                                className={!vendor.phone ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                <Phone className="h-4 w-4" />
                                <span className="sr-only">{`Call ${vendor.name}`}</span>
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{vendor.phone ? `Call ${vendor.name}` : "No phone number available"}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedPartner(vendor)
                          setIsViewDialogOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedPartner(vendor)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
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
                              This will permanently delete the vendor. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(vendor.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddPartnerDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} partnerType="VENDOR" />

      {selectedPartner && (
        <>
          <ViewPartnerDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} partner={selectedPartner} />
          <EditPartnerDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} partner={selectedPartner} />
        </>
      )}
    </div>
  )
}
