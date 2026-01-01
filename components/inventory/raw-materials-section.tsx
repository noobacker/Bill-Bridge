"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Edit, Plus, Search, Trash } from "lucide-react"
import { AddRawMaterialDialog } from "./add-raw-material-dialog"
import { EditRawMaterialDialog } from "./edit-raw-material-dialog"
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
import { RawMaterialsTable } from "@/components/raw-materials/raw-materials-table"

interface RawMaterial {
  id: string
  name: string
  unit: string
  currentStock: number
  minStockLevel: number
  vendorName?: string
}

interface Partner {
  id: string
  name: string
  type: string
}

interface RawMaterialsSectionProps {
  rawMaterials: RawMaterial[]
  partners: Partner[]
}

export function RawMaterialsSection({ rawMaterials, partners }: RawMaterialsSectionProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null)

  const rawMaterialsWithVendor = rawMaterials.map((mat) => ({
    ...mat,
    vendorName: mat.vendorName || '-',
  }))

  const filteredMaterials = rawMaterialsWithVendor.filter((material) =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/raw-materials/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete raw material")
      }

      toast({
        title: "Success",
        description: "Raw material has been deleted successfully.",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete raw material. It may be in use.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search materials..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Material
        </Button>
      </div>

      <RawMaterialsTable rawMaterials={filteredMaterials} onEdit={(material) => {
        setSelectedMaterial(material);
        setIsEditDialogOpen(true);
      }} />

      <AddRawMaterialDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} partners={partners} rawMaterials={rawMaterialsWithVendor} />

      {selectedMaterial && (
        <EditRawMaterialDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} material={selectedMaterial} partners={partners} />
      )}
    </div>
  )
}
