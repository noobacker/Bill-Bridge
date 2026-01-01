"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Plus, Trash, Search } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface StorageLocation {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  capacity?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export function LocationsSettings() {
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<StorageLocation | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    capacity: "",
  });

  // Search and filter state
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/storage-locations");
      const data = await res.json();
      setLocations(data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch storage locations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Filtering and sorting logic
  let filteredLocations = locations.filter(
    (location) =>
      location.name.toLowerCase().includes(search.toLowerCase()) ||
      (location.description &&
        location.description.toLowerCase().includes(search.toLowerCase())) ||
      (location.address &&
        location.address.toLowerCase().includes(search.toLowerCase()))
  );

  if (sortBy === "name-asc") {
    filteredLocations = filteredLocations.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } else if (sortBy === "name-desc") {
    filteredLocations = filteredLocations.sort((a, b) =>
      b.name.localeCompare(a.name)
    );
  } else if (sortBy === "capacity") {
    filteredLocations = filteredLocations.sort(
      (a, b) => (b.capacity || 0) - (a.capacity || 0)
    );
  }

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openAddDialog = () => {
    setIsEditing(false);
    setSelectedLocation(null);
    setFormData({
      name: "",
      description: "",
      address: "",
      capacity: "",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (location: StorageLocation) => {
    setIsEditing(true);
    setSelectedLocation(location);
    setFormData({
      name: location.name,
      description: location.description || "",
      address: location.address || "",
      capacity: location.capacity?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm("Are you sure you want to delete this storage location?")
    )
      return;
    try {
      const res = await fetch(`/api/storage-locations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast({
        title: "Deleted",
        description: "Storage location deleted successfully.",
      });
      fetchLocations();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete storage location.",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Location name is required.",
        variant: "destructive",
      });
      return;
    }
    try {
      const url =
        isEditing && selectedLocation
          ? `/api/storage-locations/${selectedLocation.id}`
          : "/api/storage-locations";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          capacity: formData.capacity ? Number(formData.capacity) : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast({
        title: "Success",
        description: `Storage location ${
          isEditing ? "updated" : "added"
        } successfully.`,
      });
      setIsDialogOpen(false);
      setIsEditing(false);
      setSelectedLocation(null);
      setFormData({
        name: "",
        description: "",
        address: "",
        capacity: "",
      });
      fetchLocations();
    } catch {
      toast({
        title: "Error",
        description: `Failed to ${
          isEditing ? "update" : "add"
        } storage location.`,
        variant: "destructive",
      });
    }
  };

  const sortLabel =
    sortBy === "name-asc"
      ? "Name (A-Z)"
      : sortBy === "name-desc"
      ? "Name (Z-A)"
      : "Capacity";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Storage Locations</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex flex-1 gap-2 items-center">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search locations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-2 border-none bg-muted focus:bg-background rounded-full shadow-none"
                  aria-label="Search storage locations"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="ml-2 px-4 py-2 bg-muted border border-border rounded-md shadow-sm text-sm flex items-center gap-2"
                    aria-label="Sort locations"
                    style={{ minWidth: 140 }}
                  >
                    Sort: {sortLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="border border-border rounded-md bg-background shadow-md"
                >
                  <DropdownMenuItem onClick={() => setSortBy("name-asc")}>
                    Name (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("name-desc")}>
                    Name (Z-A)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("capacity")}>
                    Capacity
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                className="ml-2 px-3 py-1 rounded-full text-sm"
                onClick={() => {
                  setSearch("");
                  setSortBy("name-asc");
                }}
                type="button"
                aria-label="Clear filters"
              >
                Clear
              </Button>
            </div>

            <div className="flex-shrink-0">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={openAddDialog}
                    className="px-4 py-2 rounded-md shadow-sm text-sm flex items-center gap-2 hover:bg-primary/90"
                    variant="default"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Location
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {isEditing
                        ? "Edit Storage Location"
                        : "Add Storage Location"}
                    </DialogTitle>
                    <DialogDescription>
                      {isEditing
                        ? "Update the details of the storage location."
                        : "Add a new storage location for inventory management."}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Location Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleFormChange}
                          required
                          placeholder="e.g., Warehouse A, Office Storage"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleFormChange}
                          rows={2}
                          placeholder="Brief description of the location"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleFormChange}
                          rows={2}
                          placeholder="Physical address of the location"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="capacity">Capacity (optional)</Label>
                        <Input
                          id="capacity"
                          name="capacity"
                          type="number"
                          min="0"
                          value={formData.capacity}
                          onChange={handleFormChange}
                          placeholder="Maximum storage capacity"
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button type="submit">
                        {isEditing ? "Update Location" : "Add Location"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>Loading...</TableCell>
                  </TableRow>
                ) : filteredLocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      No storage locations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLocations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">
                        {location.name}
                      </TableCell>
                      <TableCell>{location.description || "-"}</TableCell>
                      <TableCell>{location.address || "-"}</TableCell>
                      <TableCell>
                        {location.capacity ? `${location.capacity} units` : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(location)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(location.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

