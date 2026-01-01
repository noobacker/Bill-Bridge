"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Product {
  id: string;
  name: string;
}

interface ProductFilterProps {
  onProductChange: (productId: string | null) => void;
  className?: string;
}

export function ProductFilter({ onProductChange, className }: ProductFilterProps) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard/products");
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleSelect = (productId: string) => {
    if (productId === "all") {
      setSelectedProduct(null);
      onProductChange(null);
    } else {
      const product = products.find(p => p.id === productId);
      setSelectedProduct(product || null);
      onProductChange(productId);
    }
    setOpen(false);
  };

  return (
    <div className={cn("flex items-center space-x-4", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between text-sm"
            disabled={loading}
          >
            {loading ? "Loading..." : selectedProduct?.name || "All Products"}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search products..." />
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => handleSelect("all")}
                className="text-sm"
                value="all"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !selectedProduct ? "opacity-100" : "opacity-0"
                  )}
                />
                All Products
              </CommandItem>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  onSelect={() => handleSelect(product.id)}
                  className="text-sm"
                  value={product.name}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedProduct?.id === product.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {product.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
} 