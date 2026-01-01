"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import { Checkbox } from "@/components/ui/checkbox";

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
}

interface StorageLocation {
  id: string;
  name: string;
}

interface ProductType {
  id: string;
  name: string;
  hsnNumber: string;
}

interface MaterialUsage {
  materialId: string;
  quantity: number;
}

interface AddProductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawMaterials: RawMaterial[];
  storageLocations: StorageLocation[];
  productTypes: ProductType[];
}

export function AddProductionDialog({
  open,
  onOpenChange,
  rawMaterials,
  storageLocations,
  productTypes,
}: AddProductionDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Get current date in IST timezone
  const today = utcToZonedTime(new Date(), "Asia/Kolkata");
  const formattedDate = format(today, "yyyy-MM-dd");

  const [formData, setFormData] = useState({
    productTypeId: "",
    quantity: 0,
    productionDate: formattedDate,
    storageLocationId: "",
    notes: "",
  });
  const [touched, setTouched] = useState<{ [k: string]: boolean }>({});
  const [materialsUsed, setMaterialsUsed] = useState<MaterialUsage[]>([]);
  const [currentMaterial, setCurrentMaterial] = useState({
    materialId: "",
    quantity: 0,
  });

  const [skipRawMaterials, setSkipRawMaterials] = useState(false);
  const [materialsError, setMaterialsError] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? Number.parseInt(value) || 0 : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleMaterialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentMaterial((prev) => ({
      ...prev,
      [name]: name === "quantity" ? Number.parseFloat(value) || 0 : value,
    }));
  };

  const handleMaterialSelectChange = (value: string) => {
    setCurrentMaterial((prev) => ({
      ...prev,
      materialId: value,
    }));
  };

  const addMaterial = () => {
    if (!currentMaterial.materialId || currentMaterial.quantity <= 0) {
      toast({
        title: "Error",
        description: "Please select a material and enter a valid quantity.",
        variant: "destructive",
      });
      return;
    }

    // Check if material already exists in the list
    const existingIndex = materialsUsed.findIndex(
      (m) => m.materialId === currentMaterial.materialId
    );

    if (existingIndex >= 0) {
      // Update existing material
      const updatedMaterials = [...materialsUsed];
      updatedMaterials[existingIndex].quantity += currentMaterial.quantity;
      setMaterialsUsed(updatedMaterials);
    } else {
      // Add new material
      setMaterialsUsed([...materialsUsed, { ...currentMaterial }]);
    }

    // Reset current material and clear error
    setCurrentMaterial({
      materialId: "",
      quantity: 0,
    });
    setMaterialsError(false);
  };

  const removeMaterial = (materialId: string) => {
    setMaterialsUsed(materialsUsed.filter((m) => m.materialId !== materialId));
  };

  const getMaterialName = (materialId: string) => {
    const material = rawMaterials.find((m) => m.id === materialId);
    return material ? material.name : "Unknown Material";
  };

  const getMaterialUnit = (materialId: string) => {
    const material = rawMaterials.find((m) => m.id === materialId);
    return material ? material.unit : "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // basic required field validation
    const missing: string[] = [];
    if (!formData.productTypeId) missing.push("productTypeId");
    if (!formData.quantity || formData.quantity <= 0) missing.push("quantity");
    if (!formData.productionDate) missing.push("productionDate");
    if (!formData.storageLocationId) missing.push("storageLocationId");

    if (missing.length > 0) {
      const newTouched: any = {};
      missing.forEach((k) => (newTouched[k] = true));
      setTouched((prev) => ({ ...prev, ...newTouched }));
      toast({
        title: "Missing required fields",
        description: "Please fill all highlighted fields.",
        variant: "destructive",
      });
      return;
    }

    // Enforce raw material rule: either add at least one material, or tick the checkbox
    if (!skipRawMaterials && materialsUsed.length === 0) {
      setMaterialsError(true);
      toast({
        title: "Raw materials required",
        description:
          "Either add at least one raw material or tick 'Don't record raw material for this production'.",
        variant: "destructive",
      });
      return;
    }

    setMaterialsError(false);

    setIsLoading(true);

    try {
      const response = await fetch("/api/production", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          remainingQuantity: formData.quantity,
          materialsUsed: skipRawMaterials ? [] : materialsUsed,
          skipRawMaterials,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to create production batch"
        );
      }

      toast({
        title: "Success",
        description: "Production batch has been created successfully.",
      });

      onOpenChange(false);
      setFormData({
        productTypeId: "",
        quantity: 0,
        productionDate: formattedDate,
        storageLocationId: "",
        notes: "",
      });
      setMaterialsUsed([]);
      setSkipRawMaterials(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message ||
          "Failed to create production batch. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Production</DialogTitle>
          <DialogDescription>
            Record a new production batch of bricks.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 py-3 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="productTypeId">Product Type</Label>
                <Select
                  onValueChange={(value) =>
                    handleSelectChange("productTypeId", value)
                  }
                  required
                >
                  <SelectTrigger className={touched.productTypeId && !formData.productTypeId ? "ring-2 ring-red-500" : undefined}>
                    <SelectValue placeholder="Select product type" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({type.hsnNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  placeholder="10000"
                  value={formData.quantity}
                  onChange={handleChange}
                  className={touched.quantity && (!formData.quantity || formData.quantity <= 0) ? "ring-2 ring-red-500" : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productionDate">Production Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="productionDate"
                    name="productionDate"
                    type="date"
                    value={formData.productionDate}
                    onChange={handleChange}
                    className={"pl-8 " + (touched.productionDate && !formData.productionDate ? "ring-2 ring-red-500" : "")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="storageLocationId">Storage Location</Label>
                <Select
                  onValueChange={(value) =>
                    handleSelectChange("storageLocationId", value)
                  }
                >
                  <SelectTrigger className={touched.storageLocationId && !formData.storageLocationId ? "ring-2 ring-red-500" : undefined}>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {storageLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-2" />

            <div>
              <Label>Raw Materials Used</Label>
              <div
                className={
                  "mt-2 rounded-md p-2 " +
                  (materialsError
                    ? "border border-red-500 bg-red-50/60"
                    : "border border-transparent")
                }
              >
                <div className="grid grid-cols-[1fr,auto,auto] gap-2 items-end">
                <div>
                  <Select
                    onValueChange={handleMaterialSelectChange}
                    value={currentMaterial.materialId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name} ({material.currentStock}{" "}
                          {material.unit} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                  <div>
                    <Input
                      name="quantity"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Quantity"
                      value={currentMaterial.quantity || ""}
                      onChange={handleMaterialChange}
                    />
                  </div>
                  <Button type="button" onClick={addMaterial}>
                    Add
                  </Button>
                </div>

                {materialsUsed.length > 0 && (
                  <div className="mt-4 border rounded-md p-2">
                  <div className="text-sm font-medium mb-2">
                    Materials List:
                  </div>
                  <div className="space-y-2">
                    {materialsUsed.map((material) => (
                      <div
                        key={material.materialId}
                        className="flex justify-between items-center text-sm"
                      >
                        <span>
                          {getMaterialName(material.materialId)} -{" "}
                          {material.quantity}{" "}
                          {getMaterialUnit(material.materialId)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMaterial(material.materialId)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="skipRawMaterials"
                checked={skipRawMaterials}
                onCheckedChange={(checked) => {
                  setSkipRawMaterials(checked === true);
                  if (checked) {
                    setMaterialsError(false);
                  }
                }}
              />
              <div className="space-y-1 text-sm">
                <Label htmlFor="skipRawMaterials">
                  Don't record raw material for this production.
                </Label>
                {/* <p className="text-xs text-muted-foreground">
                  Check it only if you don’t want raw materials to this production.
                </p> */}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Additional notes about this production batch..."
                value={formData.notes}
                onChange={handleChange}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Production"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
