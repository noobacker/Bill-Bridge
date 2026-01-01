"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Edit, History, Search, Trash } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
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
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Pagination from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  vendorName?: string;
  lastInventoryDate?: string;
}

interface RawMaterialsTableProps {
  rawMaterials: RawMaterial[];
  onEdit?: (material: RawMaterial) => void;
}

interface PurchaseHistoryEntry {
  id: string;
  date: string;
  quantity: number | null;
  rate: number | null;
  amount: number;
  vendorName: string | null;
  billNumber: string | null;
  paymentStatus: string | null;
}

export function RawMaterialsTable({
  rawMaterials,
  onEdit,
}: RawMaterialsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [doubleConfirmId, setDoubleConfirmId] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMaterial, setHistoryMaterial] = useState<RawMaterial | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<PurchaseHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const router = useRouter();

  // Filter raw materials based on search term
  const filteredMaterials = useMemo(() => {
    if (!searchTerm) return rawMaterials;
    const searchLower = searchTerm.toLowerCase();
    return rawMaterials.filter(
      (material) =>
        material.name.toLowerCase().includes(searchLower) ||
        material.unit.toLowerCase().includes(searchLower) ||
        material.vendorName?.toLowerCase().includes(searchLower) ||
        material.currentStock.toString().includes(searchTerm) ||
        material.minStockLevel.toString().includes(searchTerm)
    );
  }, [rawMaterials, searchTerm]);

  // Pagination
  const totalItems = filteredMaterials.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedMaterials = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMaterials.slice(start, start + pageSize);
  }, [filteredMaterials, page, pageSize]);

  // Reset to first page when search term or page size changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, pageSize]);

  useEffect(() => {
    if (!historyOpen || !historyMaterial) {
      return;
    }

    let cancelled = false;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const response = await fetch(
          `/api/raw-materials/${historyMaterial.id}/purchases`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch purchase history");
        }
        const data: PurchaseHistoryEntry[] = await response.json();
        if (!cancelled) {
          setHistoryEntries(data);
        }
      } catch (error) {
        if (!cancelled) {
          setHistoryError("Unable to load purchase history. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [historyOpen, historyMaterial]);

  const closeHistoryDialog = () => {
    setHistoryOpen(false);
    setHistoryMaterial(null);
    setHistoryEntries([]);
    setHistoryError(null);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/raw-materials/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete raw material");
      }
      toast({
        title: "Success",
        description: "Raw material has been deleted successfully.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete raw material. It may be in use.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDoubleConfirmId(null);
      setConfirmInput("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search raw materials..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Min Stock Level</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Last Inventory Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMaterials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {searchTerm ? 'No matching raw materials found.' : 'No raw materials found.'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedMaterials.map((material) => {
                const isDoubleConfirm = doubleConfirmId === material.id;
                const isInputMatch =
                  confirmInput.trim().toLowerCase() ===
                  material.name.trim().toLowerCase();
                return (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">
                      {material.name}
                    </TableCell>
                    <TableCell>
                      {material.currentStock} {material.unit}
                    </TableCell>
                    <TableCell>
                      {material.minStockLevel} {material.unit}
                    </TableCell>
                    <TableCell>{material.vendorName || "-"}</TableCell>
                    <TableCell>
                      {material.lastInventoryDate
                        ? format(
                            new Date(material.lastInventoryDate),
                            "yyyy-MM-dd"
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {material.currentStock <= material.minStockLevel ? (
                        <Badge variant="destructive">Low Stock</Badge>
                      ) : (
                        <Badge variant="outline">In Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setHistoryMaterial(material);
                            setHistoryOpen(true);
                          }}
                        >
                          <History className="h-4 w-4" />
                          <span className="sr-only">View purchase history</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit && onEdit(material)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <AlertDialog
                          open={deletingId === material.id}
                          onOpenChange={(open) =>
                            setDeletingId(open ? material.id : null)
                          }
                        >
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
                                This will permanently delete the raw material.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                onClick={() => setDeletingId(null)}
                              >
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  setDeletingId(null);
                                  setDoubleConfirmId(material.id);
                                  setConfirmInput("");
                                }}
                              >
                                Continue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog
                          open={isDoubleConfirm}
                          onOpenChange={(open) => {
                            setDoubleConfirmId(open ? material.id : null);
                            if (!open) setConfirmInput("");
                          }}
                        >
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Final Confirmation
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                To confirm deletion, please type{" "}
                                <b>{material.name}</b> below. This cannot be
                                undone and may affect inventory records.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="my-2">
                              <Input
                                autoFocus
                                placeholder={`Type "${material.name}" to confirm`}
                                value={isDoubleConfirm ? confirmInput : ""}
                                onChange={(e) =>
                                  setConfirmInput(e.target.value)
                                }
                              />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                onClick={() => {
                                  setDoubleConfirmId(null);
                                  setConfirmInput("");
                                }}
                              >
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(material.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={!isInputMatch}
                              >
                                Yes, Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={historyOpen} onOpenChange={(open) => (open ? setHistoryOpen(true) : closeHistoryDialog())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Purchase History{" "}
              {historyMaterial ? `– ${historyMaterial.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Recent purchase entries recorded for this raw material.
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="py-6 text-center text-muted-foreground">
              Loading history...
            </div>
          ) : historyError ? (
            <div className="py-6 text-center text-destructive">{historyError}</div>
          ) : historyEntries.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              No purchase history found.
            </div>
          ) : (
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell>{entry.vendorName || "-"}</TableCell>
                      <TableCell>{entry.billNumber || "-"}</TableCell>
                      <TableCell>
                        {entry.quantity != null
                          ? `${entry.quantity} ${historyMaterial?.unit ?? ""}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {entry.rate != null ? formatCurrency(entry.rate) : "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(entry.amount)}</TableCell>
                      <TableCell>
                        {entry.paymentStatus ? (
                          <Badge variant={entry.paymentStatus === "COMPLETE" ? "outline" : "secondary"}>
                            {entry.paymentStatus}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {totalItems > 0 && (
        <Pagination
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          totalItems={totalItems}
          pageSizeOptions={[10, 30, 50, 100]}
        />
      )}
    </div>
  );
}
