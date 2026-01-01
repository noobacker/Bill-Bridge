"use client";

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
import { Edit, Eye, Phone, Plus, Search, Trash } from "lucide-react";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useEffect } from "react";

interface Transportation {
  id: string;
  name: string;
  ownerName?: string | null;
  phone: string;
  city: string;
  _count: { invoices: number };
}

interface TransportationSectionProps {
  transportation: Transportation[];
}

export function TransportationSection({
  transportation: initialTransportation,
}: TransportationSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    phone: "",
    city: "",
  });
  const [transportation, setTransportation] = useState(initialTransportation);
  const [drivers, setDrivers] = useState<{ name: string; phone: string }[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    ownerName: "",
    phone: "",
  });
  const [editDrivers, setEditDrivers] = useState<
    { name: string; phone: string }[]
  >([]);
  const [editLoading, setEditLoading] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewTransport, setViewTransport] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewTransportInvoices, setViewTransportInvoices] = useState<any[]>([]);
  const [viewTransportLoading, setViewTransportLoading] = useState(false);
  const [deliveryLimit, setDeliveryLimit] = useState<"5" | "10" | "all">("5");

  const filtered = transportation.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ??
        false) ||
      t.phone.includes(searchTerm)
  );

  const handleCall = (phone?: string | null) => {
    if (phone) {
      window.location.href = `tel:${phone.replace(/[^+\d]/g, "")}`;
    } else {
      toast({ title: "No contact number found." });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/transportation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, drivers }),
      });
      if (!res.ok) throw new Error(await res.text());
      const newTransport = await res.json();
      setTransportation((prev) => [...prev, newTransport]);
      setIsDialogOpen(false);
      setForm({ name: "", ownerName: "", phone: "", city: "" });
      setDrivers([]);
      toast({ title: "Success", description: "Transportation added." });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add transportation.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (t: any) => {
    setEditForm({
      id: t.id,
      name: t.name,
      ownerName: t.ownerName || "",
      phone: t.phone,
    });
    setEditDrivers(Array.isArray(t.drivers) ? t.drivers : []);
    setEditDialogOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const res = await fetch(`/api/transportation/${editForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, drivers: editDrivers }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setTransportation((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
      setEditDialogOpen(false);
      toast({ title: "Success", description: "Transportation updated." });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update transportation.",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const openViewDialog = async (t: any) => {
    setViewTransport(t);
    setViewDialogOpen(true);
    setViewTransportLoading(true);
    try {
      const res = await fetch(`/api/transportation/${t.id}/invoices`);
      if (res.ok) {
        const data = await res.json();
        setViewTransportInvoices(data.invoices || []);
      } else {
        setViewTransportInvoices([]);
      }
    } catch {
      setViewTransportInvoices([]);
    } finally {
      setViewTransportLoading(false);
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/transportation/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      setTransportation((prev) => prev.filter((t) => t.id !== deleteId));
      setDeleteDialogOpen(false);
      toast({ title: "Deleted", description: "Transportation deleted." });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete transportation.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search transportation..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Transportation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Transportation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Transportation Name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Owner Name</label>
                <Input
                  value={form.ownerName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ownerName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Phone Number
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">City</label>
                <Input
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Drivers</label>
                {drivers.map((driver, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <Input
                      placeholder="Driver Name (optional)"
                      value={driver.name}
                      onChange={(e) =>
                        setDrivers((ds) =>
                          ds.map((d, i) =>
                            i === idx ? { ...d, name: e.target.value } : d
                          )
                        )
                      }
                      className="flex-1"
                    />
                    <Input
                      placeholder="Phone"
                      value={driver.phone}
                      onChange={(e) =>
                        setDrivers((ds) =>
                          ds.map((d, i) =>
                            i === idx ? { ...d, phone: e.target.value } : d
                          )
                        )
                      }
                      className="flex-1"
                      required
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() =>
                        setDrivers((ds) => ds.filter((_, i) => i !== idx))
                      }
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDrivers((ds) => [...ds, { name: "", phone: "" }])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Driver
                </Button>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Adding..." : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transportation Name</TableHead>
              <TableHead>Owner Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Invoices</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No transportation found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.ownerName || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {t.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t._count.invoices}</Badge>
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
                                onClick={() => handleCall(t.phone)}
                                className={
                                  !t.phone
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t.phone
                              ? `Call ${t.name}`
                              : "No phone number available"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openViewDialog(t)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(t)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(t.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transportation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Transportation Name
              </label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Owner Name (optional)
              </label>
              <Input
                value={editForm.ownerName}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, ownerName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Phone Number</label>
              <Input
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, phone: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Drivers</label>
              {editDrivers.map((driver, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input
                    placeholder="Driver Name (optional)"
                    value={driver.name}
                    onChange={(e) =>
                      setEditDrivers((ds) =>
                        ds.map((d, i) =>
                          i === idx ? { ...d, name: e.target.value } : d
                        )
                      )
                    }
                    className="flex-1"
                  />
                  <Input
                    placeholder="Phone"
                    value={driver.phone}
                    onChange={(e) =>
                      setEditDrivers((ds) =>
                        ds.map((d, i) =>
                          i === idx ? { ...d, phone: e.target.value } : d
                        )
                      )
                    }
                    className="flex-1"
                    required
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() =>
                      setEditDrivers((ds) => ds.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setEditDrivers((ds) => [...ds, { name: "", phone: "" }])
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add Driver
              </Button>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Transportation Details</DialogTitle>
          </DialogHeader>
          {viewTransport && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:gap-8 gap-2">
                <div className="flex-1 space-y-2">
                  <div className="text-lg font-semibold">
                    {viewTransport.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {viewTransport.city
                      ? viewTransport.city
                      : "City not specified"}
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <div>
                      <span className="font-medium">Owner:</span>{" "}
                      {viewTransport.ownerName || "-"}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span>{" "}
                      {viewTransport.phone || "-"}
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="font-medium">Drivers:</div>
                  <ul className="ml-2 list-disc text-sm">
                    {Array.isArray(viewTransport.drivers) &&
                    viewTransport.drivers.length > 0 ? (
                      viewTransport.drivers.map((d: any, i: number) => (
                        <li key={i}>
                          {d.name ? `${d.name} - ` : ""}
                          {d.phone}
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">No drivers</li>
                    )}
                  </ul>
                </div>
              </div>
              <div className="flex flex-row gap-8 mt-2">
                <div>
                  <span className="font-medium">Total Deliveries:</span>{" "}
                  {viewTransport._count?.invoices ?? 0}
                </div>
              </div>
              <div className="mt-4">
                <b>Recent Orders / Invoices:</b>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">Show:</span>
                  <select
                    className="border rounded px-2 py-1 text-xs bg-background"
                    value={deliveryLimit}
                    onChange={(e) =>
                      setDeliveryLimit(e.target.value as "5" | "10" | "all")
                    }
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="all">All</option>
                  </select>
                </div>
                {viewTransportLoading ? (
                  <div>Loading...</div>
                ) : viewTransportInvoices.length === 0 ? (
                  <div>No invoices found for this transportation.</div>
                ) : (
                  <div
                    className={`overflow-x-auto mt-2${
                      deliveryLimit === "all" ? " max-h-60 overflow-y-auto" : ""
                    }`}
                    style={{ maxWidth: 800 }}
                  >
                    <div className="w-full">
                      {/* Header Row */}
                      <div className="flex items-center gap-2 px-3 py-1 rounded bg-muted/80 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap w-full">
                        <div className="flex-1 text-center">Date</div>
                        <div className="flex-1 text-center">Invoice #</div>
                        <div className="flex-1 text-center">Client</div>
                        <div className="flex-1 text-center">Delivery City</div>
                        <div className="flex-1 text-center">Vehicle No.</div>
                        <div className="flex-1 text-center">Driver</div>
                        <div className="flex-1 text-center">Amount</div>
                      </div>
                      {/* Data Rows */}
                      {(deliveryLimit === "all"
                        ? viewTransportInvoices
                        : viewTransportInvoices.slice(
                            0,
                            deliveryLimit === "10" ? 10 : 5
                          )
                      ).map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 shadow-sm whitespace-nowrap w-full"
                        >
                          <div className="text-xs text-muted-foreground flex-1 text-center">
                            {new Date(inv.invoiceDate).toLocaleDateString()}
                          </div>
                          <div className="font-semibold text-xs flex-1 text-center">
                            {inv.invoiceNumber}
                          </div>
                          <div className="text-xs flex-1 text-center">
                            {inv.clientName}
                          </div>
                          <div className="text-xs flex-1 text-center">
                            {inv.deliveryCity || "-"}
                          </div>
                          <div className="text-xs flex-1 text-center">
                            {inv.transportVehicle || "-"}
                          </div>
                          <div className="text-xs flex-1 text-center">
                            {inv.driverName || "-"}
                          </div>
                          <div className="text-xs flex-1 font-medium text-center">
                            ₹{inv.totalAmount?.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transportation</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to delete this transportation?</div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
