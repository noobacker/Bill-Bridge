"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Trash } from "lucide-react";

import { AddProductionDialog } from "./add-production-dialog";
import { EditProductionDialog } from "./edit-production-dialog";
import { ManageLocationsDialog } from "./manage-locations-dialog";
import { ManageProductTypesDialog } from "./manage-product-types-dialog";

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
} from "@/components/ui/alert-dialog";

import { toast } from "@/components/ui/use-toast";

/* ================= TYPES ================= */

interface ProductionBatch {
  id: string;
  quantity: number;
  remainingQuantity: number;
  productionDate: Date;
  createdAt?: Date;
  productType: {
    id: string;
    name: string;
    hsnNumber: string;
  };
  storageLocation: {
    id: string;
    name: string;
  };
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
}

interface StorageLocation {
  id: string;
  name: string;
  description?: string | null;
}

interface ProductType {
  id: string;
  name: string;
  hsnNumber: string;
  description?: string | null;
  isService?: boolean;
  cgstRate?: number;
  sgstRate?: number;
}

interface ProductQuantity {
  name: string;
  quantity: number;
}

interface ProductionSectionProps {
  productionBatches: ProductionBatch[];
  rawMaterials: RawMaterial[];
  storageLocations: StorageLocation[];
  productTypes: ProductType[];
}

/* ================= COMPONENT ================= */

export function ProductionSection({
  productionBatches,
  rawMaterials,
  storageLocations,
  productTypes,
}: ProductionSectionProps) {
  const router = useRouter();

  /* ---------- UI State ---------- */
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLocationsDialogOpen, setIsLocationsDialogOpen] = useState(false);
  const [isProductTypesDialogOpen, setIsProductTypesDialogOpen] =
    useState(false);
  const [selectedBatch, setSelectedBatch] =
    useState<ProductionBatch | null>(null);

  const [showInventoryCounts, setShowInventoryCounts] = useState(true);

  /* ---------- Pagination ---------- */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* ---------- Filtering & Sorting ---------- */
  const filteredBatches = useMemo(() => {
    return productionBatches
      .filter(
        (batch) =>
          batch.productType.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          batch.storageLocation.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? b.productionDate).getTime() -
          new Date(a.createdAt ?? a.productionDate).getTime()
      );
  }, [productionBatches, searchTerm]);

  /* ---------- Pagination Logic ---------- */
  const totalItems = filteredBatches.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedBatches = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBatches.slice(start, start + pageSize);
  }, [filteredBatches, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, pageSize]);

  /* ---------- Delete ---------- */
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/production/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete production batch");
      }

      toast({
        title: "Success",
        description: "Production batch has been deleted successfully.",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete production batch. It may be in use.",
        variant: "destructive",
      });
    }
  };

  /* ================= STOCK SUMMARY LOGIC (PRESERVED) ================= */

  // Group production batches by location and product type
  const locationProducts = useMemo(() => {
    const locationProductsMap: Record<string, Record<string, ProductQuantity>> =
      {};

    // Initialize all locations with empty product records
    storageLocations.forEach((location) => {
      locationProductsMap[location.id] = {};
    });

    // Group batches by location and product type
    productionBatches.forEach((batch) => {
      if (batch.remainingQuantity <= 0) return;

      const locationId = batch.storageLocation.id;
      const productTypeId = batch.productType.id;
      const productName = batch.productType.name;

      // Ensure the location object exists
      if (!locationProductsMap[locationId]) {
        locationProductsMap[locationId] = {};
      }

      // Ensure the product object exists
      if (!locationProductsMap[locationId][productTypeId]) {
        locationProductsMap[locationId][productTypeId] = {
          name: productName,
          quantity: 0,
        };
      }

      locationProductsMap[locationId][productTypeId].quantity +=
        batch.remainingQuantity;
    });

    return locationProductsMap;
  }, [productionBatches, storageLocations]);

  // Calculate totals by product type
  const productTotals = useMemo(() => {
    const totals: Record<string, ProductQuantity> = {};

    productionBatches.forEach((batch) => {
      if (batch.remainingQuantity <= 0) return;

      const productTypeId = batch.productType.id;
      const productName = batch.productType.name;

      if (!totals[productTypeId]) {
        totals[productTypeId] = {
          name: productName,
          quantity: 0,
        };
      }

      totals[productTypeId].quantity += batch.remainingQuantity;
    });

    return Object.values(totals);
  }, [productionBatches]);

  // Today's production totals by product (date-only compare)
  const todaysProducts = useMemo(() => {
    const todayDateKey = new Date().toISOString().slice(0, 10);
    const todays: Record<string, ProductQuantity> = {};

    productionBatches.forEach((batch) => {
      const batchDateKey = new Date(batch.productionDate)
        .toISOString()
        .slice(0, 10);
      if (batchDateKey !== todayDateKey) return;

      const productTypeId = batch.productType.id;
      const productName = batch.productType.name;

      if (!todays[productTypeId]) {
        todays[productTypeId] = { name: productName, quantity: 0 };
      }

      // NOTE: your original logic uses batch.quantity for today's produced
      todays[productTypeId].quantity += batch.quantity;
    });

    return Object.values(todays);
  }, [productionBatches]);

  /* ================= JSX ================= */

  return (
    <div className="space-y-4">
      {/* ---------- Header ---------- */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search production..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsLocationsDialogOpen(true)}
          >
            Manage Locations
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsProductTypesDialogOpen(true)}
          >
            Manage Products
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Production
          </Button>
        </div>
      </div>

      {/* ================= Location Summary ================= */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">Available Stocks by Location</h3>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {/* Total Card */}
          <div className="bg-background p-3 rounded-md border border-primary">
            <div className="font-medium">Total Available</div>
            <div className="text-sm text-muted-foreground mb-2">
              {showInventoryCounts
                ? `${productionBatches
                    .reduce(
                      (total, batch) =>
                        total +
                        (batch.remainingQuantity > 0
                          ? batch.remainingQuantity
                          : 0),
                      0
                    )
                    .toLocaleString()} bricks available`
                : "*** bricks available"}
            </div>

            <div className="space-y-1 pt-2 border-t border-border/50">
              {productTotals.map((product) => (
                <div
                  key={product.name}
                  className="flex justify-between text-xs"
                >
                  <span className="text-muted-foreground">{product.name}:</span>
                  <span className="font-medium">
                    {showInventoryCounts
                      ? product.quantity.toLocaleString()
                      : "***"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Productions Card */}
          <div className="bg-background p-3 rounded-md border">
            <div className="font-medium">Today's Productions (all products)</div>

            {todaysProducts.length === 0 ? (
              <div className="text-sm text-muted-foreground mb-2">
                {showInventoryCounts ? "No production recorded today" : "***"}
              </div>
            ) : (
              <div className="space-y-1 pt-2 border-t border-border/50 mt-2">
                {todaysProducts.map((product) => (
                  <div
                    key={product.name}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-muted-foreground">
                      {product.name}:
                    </span>
                    <span className="font-medium">
                      {showInventoryCounts
                        ? product.quantity.toLocaleString()
                        : "***"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location Cards */}
          {storageLocations.map((location) => {
            const bricksInLocation = productionBatches
              .filter(
                (batch) =>
                  batch.storageLocation.id === location.id &&
                  batch.remainingQuantity > 0
              )
              .reduce((total, batch) => total + batch.remainingQuantity, 0);

            const locationProductsData = Object.values(
              locationProducts[location.id] || {}
            )
              .filter((product) => product.quantity > 0)
              .sort((a, b) => b.quantity - a.quantity);

            return (
              <div
                key={location.id}
                className="bg-background p-3 rounded-md border"
              >
                <div className="font-medium">{location.name}</div>
                <div className="text-sm text-muted-foreground mb-2">
                  {showInventoryCounts
                    ? `${bricksInLocation.toLocaleString()} bricks available`
                    : "*** bricks available"}
                </div>

                {locationProductsData.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-border/50">
                    {locationProductsData.map((product) => (
                      <div
                        key={product.name}
                        className="flex justify-between text-xs"
                      >
                        <span className="text-muted-foreground">
                          {product.name}:
                        </span>
                        <span className="font-medium">
                          {showInventoryCounts
                            ? product.quantity.toLocaleString()
                            : "***"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= Table ================= */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Production Date</TableHead>
              <TableHead>Product Type</TableHead>
              <TableHead>HSN Number</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Production Quantity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedBatches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No production batches found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedBatches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>
                    {new Date(batch.productionDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {batch.productType.name}
                  </TableCell>
                  <TableCell>{batch.productType.hsnNumber}</TableCell>
                  <TableCell>{batch.storageLocation.name}</TableCell>
                  <TableCell>{batch.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedBatch(batch);
                          setIsEditDialogOpen(true);
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
                              This will permanently delete the production batch.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(batch.id)}
                            >
                              Delete
                            </AlertDialogAction>
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

      {/* ================= Pagination ================= */}
      {totalItems > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, totalItems)} of {totalItems}
          </div>

          <div className="flex items-center gap-2">
            <select
              className="border rounded px-2 py-1 text-sm bg-background"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 30, 50, 100].map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </select>

            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>

            <span className="text-sm">
              {page} / {totalPages || 1}
            </span>

            <Button
              size="sm"
              variant="outline"
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ================= Dialogs ================= */}
      <AddProductionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        rawMaterials={rawMaterials}
        storageLocations={storageLocations}
        productTypes={productTypes as any}
      />

      {selectedBatch && (
        <EditProductionDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          batch={selectedBatch}
          storageLocations={storageLocations}
        />
      )}

      <ManageLocationsDialog
        open={isLocationsDialogOpen}
        onOpenChange={setIsLocationsDialogOpen}
        locations={storageLocations}
      />

      <ManageProductTypesDialog
        open={isProductTypesDialogOpen}
        onOpenChange={setIsProductTypesDialogOpen}
        productTypes={productTypes as any}
      />
    </div>
  );
}
