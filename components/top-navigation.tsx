"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/contexts/sidebar-context";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  category?: string;
}

export function TopNavigation() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { sidebarCollapsed } = useSidebar();

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: null,
      category: "main",
    },
    {
      title: "Raw Materials",
      href: "/dashboard/inventory/raw-materials",
      icon: null,
      category: "inventory",
    },
    {
      title: "Production Inventory",
      href: "/dashboard/inventory/production",
      icon: null,
      category: "inventory",
    },
    {
      title: "Sales",
      href: "/dashboard/sales",
      icon: null,
      category: "main",
    },
    {
      title: "Expenses",
      href: "/dashboard/expenses",
      icon: null,
      category: "main",
    },
    {
      title: "Reports",
      href: "/dashboard/reports",
      icon: null,
      category: "main",
    },
    {
      title: "Partners",
      href: "/dashboard/partners",
      icon: null,
      category: "main",
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: null,
      category: "main",
    },
  ];

  // Filter nav items based on search query
  const filteredNavItems = navItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowSearchResults(query.length > 0);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const handleSearchFocus = () => {
    setShowSearchResults(true);
  };

  const handleSearchBlur = () => {
    // Don't hide results immediately on blur, let user click outside
    setTimeout(() => {
      if (searchQuery === "") {
        setShowSearchResults(false);
      }
    }, 200);
  };

  return (
    <div className="relative">
      {/* Search Bar */}
      <div className="flex items-center justify-center px-4 py-2">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search navigation..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showSearchResults && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-full max-w-md bg-background border rounded-md shadow-lg z-50 mt-1">
          <div className="py-2">
            {filteredNavItems.length > 0 ? (
              filteredNavItems.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => {
                    setShowSearchResults(false);
                    setSearchQuery("");
                  }}
                >
                  {item.title}
                </a>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-muted-foreground text-center">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

