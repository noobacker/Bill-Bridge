import { db } from "@/lib/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import React from "react"

export default async function StockReportPage() {
  const rawMaterials = await db.rawMaterial.findMany({
    orderBy: { name: "asc" },
    include: {
      purchases: {
        orderBy: { purchaseDate: "desc" },
        take: 1,
      },
    },
  })

  // Calculate total value
  const rawMaterialsWithValue = rawMaterials.map((mat) => ({
    ...mat,
    value: mat.currentStock * (mat.purchases[0]?.rate || 0),
  }))
  const totalRawMaterialsValue = rawMaterialsWithValue.reduce((sum, mat) => sum + mat.value, 0)

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rawMaterialsWithValue.map((material) => (
              <TableRow key={material.id}>
                <TableCell className="font-medium">{material.name}</TableCell>
                <TableCell>
                  {material.currentStock} {material.unit}
                </TableCell>
                <TableCell>₹{material.value.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={material.currentStock <= material.minStockLevel ? "destructive" : "outline"}>
                    {material.currentStock <= material.minStockLevel ? "Low" : "Normal"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Raw Materials Value</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">₹{totalRawMaterialsValue.toLocaleString()}</span>
          </CardContent>
        </Card>
      </div>
    </>
  )
} 