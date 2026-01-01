"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettings } from "./company-settings";
import { UserManagement } from "./user-management";
import { BillSettings } from "./bill-settings";
import { LocationsSettings } from "./locations-settings";
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
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface ProductType {
  id: string;
  name: string;
  hsnNumber: string;
  description?: string | null;
  isService: boolean;
  cgstRate: number;
  sgstRate: number;
  igstRate?: number;
}

function ManageProductsSection() {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    hsnNumber: "",
    description: "",
    isService: false,
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 0,
  });
  // Search, filter, sort state
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all"); // all, product, service
  const [sortBy, setSortBy] = useState("name-asc"); // name-asc, name-desc, category

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/product-types");
      const data = await res.json();
      setProducts(data);
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch products.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filtering, searching, sorting logic
  let filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.hsnNumber.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      category === "all" ||
      (category === "product" && !p.isService) ||
      (category === "service" && p.isService);
    return matchesSearch && matchesCategory;
  });
  if (sortBy === "name-asc") {
    filteredProducts = filteredProducts.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } else if (sortBy === "name-desc") {
    filteredProducts = filteredProducts.sort((a, b) =>
      b.name.localeCompare(a.name)
    );
  } else if (sortBy === "category") {
    filteredProducts = filteredProducts.sort((a, b) => {
      if (a.isService === b.isService) return 0;
      return a.isService ? 1 : -1; // Products first, then services
    });
  }

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    let fieldValue: string | boolean = value;
    if (type === "checkbox") {
      fieldValue = (e.target as HTMLInputElement).checked;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));
  };

  const openAddDialog = () => {
    setIsEditing(false);
    setSelectedProduct(null);
    setFormData({
      name: "",
      hsnNumber: "",
      description: "",
      isService: false,
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 0,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (product: ProductType) => {
    setIsEditing(true);
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      hsnNumber: product.hsnNumber,
      description: product.description || "",
      isService: product.isService,
      cgstRate: product.cgstRate,
      sgstRate: product.sgstRate,
      igstRate: product.igstRate ?? 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;
    try {
      const res = await fetch(`/api/product-types/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Deleted", description: "Product deleted successfully." });
      fetchProducts();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete product.",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.hsnNumber.trim()) {
      toast({
        title: "Error",
        description: "Product name and HSN number are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      const url =
        isEditing && selectedProduct
          ? `/api/product-types/${selectedProduct.id}`
          : "/api/product-types";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          cgstRate: Number(formData.cgstRate),
          sgstRate: Number(formData.sgstRate),
          igstRate: Number(formData.igstRate),
        }),
      });
      if (!res.ok) throw new Error();
      toast({
        title: "Success",
        description: `Product ${isEditing ? "updated" : "added"} successfully.`,
      });
      setIsDialogOpen(false);
      setIsEditing(false);
      setSelectedProduct(null);
      setFormData({
        name: "",
        hsnNumber: "",
        description: "",
        isService: false,
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 0,
      });
      fetchProducts();
    } catch {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "add"} product.`,
        variant: "destructive",
      });
    }
  };

  // For label display
  const sortLabel =
    sortBy === "name-asc"
      ? "Name (A-Z)"
      : sortBy === "name-desc"
      ? "Name (Z-A)"
      : "Category";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Products</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Modern Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex flex-1 gap-2 items-center">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name or HSN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-2 border-none bg-muted focus:bg-background rounded-full shadow-none"
                  aria-label="Search products by name or HSN"
                />
              </div>
              {/* Dropdown for category */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="ml-2 px-4 py-2 bg-muted border border-border rounded-md shadow-sm text-sm flex items-center gap-2"
                    aria-label="Filter by type"
                    style={{ minWidth: 110 }}
                  >
                    {category === "all"
                      ? "All"
                      : category === "product"
                      ? "Product"
                      : "Service"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="border border-border rounded-md bg-background shadow-md"
                >
                  <DropdownMenuItem onClick={() => setCategory("all")}>
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCategory("product")}>
                    Product
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCategory("service")}>
                    Service
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* shadcn dropdown for sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="ml-2 px-4 py-2 bg-muted border border-border rounded-md shadow-sm text-sm flex items-center gap-2"
                    aria-label="Sort products"
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
                  <DropdownMenuItem onClick={() => setSortBy("category")}>
                    Category
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                className="ml-2 px-3 py-1 rounded-full text-sm"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
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
                    <Plus className="mr-2 h-4 w-4" /> Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {isEditing ? "Edit Product" : "Add Product"}
                    </DialogTitle>
                    <DialogDescription>
                      {isEditing
                        ? "Update the details of the product."
                        : "Add a new product with HSN and tax rates."}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hsnNumber">HSN Number</Label>
                        <Input
                          id="hsnNumber"
                          name="hsnNumber"
                          value={formData.hsnNumber}
                          onChange={handleFormChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cgstRate">CGST Rate (%)</Label>
                        <Input
                          id="cgstRate"
                          name="cgstRate"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.cgstRate}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sgstRate">SGST Rate (%)</Label>
                        <Input
                          id="sgstRate"
                          name="sgstRate"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.sgstRate}
                          onChange={handleFormChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="igstRate">IGST Rate (%)</Label>
                        <Input
                          id="igstRate"
                          name="igstRate"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.igstRate}
                          onChange={handleFormChange}
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
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isService"
                          name="isService"
                          checked={formData.isService}
                          onChange={handleFormChange}
                        />
                        <Label htmlFor="isService">
                          This is a service (not a physical product)
                        </Label>
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button type="submit">
                        {isEditing ? "Update Product" : "Add Product"}
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
                  <TableHead>HSN</TableHead>
                  <TableHead>CGST</TableHead>
                  <TableHead>SGST</TableHead>
                  <TableHead>IGST</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8}>Loading...</TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>No products found.</TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.hsnNumber}</TableCell>
                      <TableCell>{product.cgstRate ?? "-"}</TableCell>
                      <TableCell>{product.sgstRate ?? "-"}</TableCell>
                      <TableCell>{product.igstRate ?? "-"}</TableCell>
                      <TableCell>{product.description || "-"}</TableCell>
                      <TableCell>
                        {product.isService ? (
                          <Badge variant="outline">Service</Badge>
                        ) : (
                          "Product"
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
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

export function SettingsTabs() {
  return (
    <Tabs defaultValue="company" className="space-y-4">
      <TabsList className="flex flex-wrap gap-2 justify-start md:justify-between">
        <TabsTrigger value="company">Company Details</TabsTrigger>
        <TabsTrigger value="products">Product and taxes</TabsTrigger>
        <TabsTrigger value="locations">Manage Locations</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
      </TabsList>

      <TabsContent value="company" className="space-y-4">
        <CompanySettings />
      </TabsContent>

      <TabsContent value="products" className="space-y-4">
        <ManageProductsSection />
      </TabsContent>

      <TabsContent value="locations" className="space-y-4">
        <LocationsSettings />
      </TabsContent>

      <TabsContent value="users" className="space-y-4">
        <UserManagement />
      </TabsContent>
    </Tabs>
  );
}
