import { db } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export async function StockReport() {
  // Fetch real data from the database
  const rawMaterials = await db.rawMaterial.findMany({ orderBy: { name: "asc" } })
  const productionBatches = await db.productionBatch.findMany({
    orderBy: { productionDate: "desc" },
    include: { storageLocation: true },
  })

  // Calculate values (assuming you have a value field or calculate from purchaseAmount/currentStock)
  const totalRawMaterialValue = rawMaterials.reduce((sum, item) => sum + (item.purchaseAmount || 0), 0)
  const totalProductionValue = productionBatches.reduce((sum, item) => sum + (item.value || 0), 0)
  const totalStockValue = totalRawMaterialValue + totalProductionValue

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Stock Valuation Report</h2>
          <p className="text-muted-foreground">Current inventory status and valuation</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Raw Materials Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRawMaterialValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Production Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalProductionValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₹{totalStockValue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Raw Materials Stock</CardTitle>
          <CardDescription>Current raw material inventory levels</CardDescription>
        </CardHeader>
        <CardContent>
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
              {rawMaterials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.name}</TableCell>
                  <TableCell>
                    {material.currentStock} {material.unit}
                  </TableCell>
                  <TableCell>₹{(material.purchaseAmount || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={material.currentStock <= material.minStockLevel ? "destructive" : "outline"}>
                      {material.currentStock <= material.minStockLevel ? "Low" : "Normal"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Production Batches</CardTitle>
          <CardDescription>Current production inventory by batch</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Remaining Quantity</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productionBatches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.id}</TableCell>
                  <TableCell>{batch.storageLocation?.name || "-"}</TableCell>
                  <TableCell>{batch.remainingQuantity.toLocaleString()} bricks</TableCell>
                  <TableCell>₹{(batch.value || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        batch.remainingQuantity === 0
                          ? "secondary"
                          : batch.remainingQuantity < 1000
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {batch.remainingQuantity === 0
                        ? "Depleted"
                        : batch.remainingQuantity < 1000
                        ? "Low"
                        : "Available"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
