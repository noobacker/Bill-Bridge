"use client";

import type React from "react";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Image from "next/image";
import {
  LayoutDashboard,
  Package,
  Users,
  Factory,
  ShoppingCart,
  FileText,
  BarChart3,
  Settings,
  Menu,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useSidebar } from "@/contexts/sidebar-context";
import { useI18n } from "@/components/i18n/i18n-provider";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  category?: string;
  sectionKey?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const [companyName, setCompanyName] = useState("Bill Bridge");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    async function fetchCompanyInfo() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();
        setCompanyName(data.companyName || "Bill Bridge");
        setLogoUrl(data.logoUrl || "/images/default_logo.png");
        setLogoLoaded(true);
      } catch {
        setLogoLoaded(true);
      }
    }
    fetchCompanyInfo();
    // Listen for custom event to update company name or logo
    const handler = () => fetchCompanyInfo();
    window.addEventListener("companyNameUpdated", handler);
    return () => window.removeEventListener("companyNameUpdated", handler);
  }, []);

  const isAdmin = session?.user?.role === "ADMIN";
  const allowedSections: string[] =
    isAdmin
      ? [
          "dashboard",
          "raw-materials",
          "production",
          "inventory",
          "sales",
          "expenses",
          "reports",
          "partners",
          "settings",
        ]
      : ((session?.user as any)?.allowedSections as string[]) || [];

  const navItems: NavItem[] = [
    {
      title: t("nav.dashboard"),
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      category: "main",
      sectionKey: "dashboard",
    },
    {
      title: t("nav.rawMaterials"),
      href: "/dashboard/inventory/raw-materials",
      icon: <Package className="h-5 w-5" />,
      category: "inventory",
      sectionKey: "raw-materials",
    },
    {
      title: t("nav.productionInventory"),
      href: "/dashboard/inventory/production",
      icon: <Factory className="h-5 w-5" />,
      category: "inventory",
      sectionKey: "production",
    },
    {
      title: t("nav.sales"),
      href: "/dashboard/sales",
      icon: <ShoppingCart className="h-5 w-5" />,
      category: "main",
      sectionKey: "sales",
    },
    {
      title: t("nav.expenses"),
      href: "/dashboard/expenses",
      icon: <DollarSign className="h-5 w-5" />,
      category: "main",
      sectionKey: "expenses",
    },
    {
      title: t("nav.reports"),
      href: "/dashboard/reports",
      icon: <BarChart3 className="h-5 w-5" />,
      category: "main",
      sectionKey: "reports",
    },
    {
      title: t("nav.partners"),
      href: "/dashboard/partners",
      icon: <Users className="h-5 w-5" />,
      category: "main",
      sectionKey: "partners",
    },
    {
      title: t("nav.settings"),
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
      category: "main",
      sectionKey: "settings",
    },
  ];

  useEffect(() => {
    const openHandler = () => setMobileOpen(true);
    window.addEventListener("openSidebar", openHandler);
    return () => window.removeEventListener("openSidebar", openHandler);
  }, []);

  const NavItems = () => (
    <>
      <div className="flex items-center h-16 px-4 border-b">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <div
            className={cn(
              "relative",
              sidebarCollapsed ? "h-8 w-8" : "h-16 w-16"
            )}
          >
            {logoLoaded && logoUrl && (
              <Image
                src={logoUrl}
                alt="Company Logo"
                fill
                className="object-contain"
                priority
              />
            )}
            {!logoLoaded && (
              <div
                className={cn(
                  "bg-gray-100 rounded animate-pulse",
                  sidebarCollapsed ? "h-8 w-8" : "h-16 w-16"
                )}
              />
            )}
          </div>
          {!sidebarCollapsed && (
            <span className="font-bold">{companyName}</span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="ml-auto h-8 w-8 p-0"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="grid gap-1 px-2">
          {navItems
            .filter((item) => {
              if (item.adminOnly && !isAdmin) return false;
              if (isAdmin) return true;
              // For supervisors: if no allowedSections set, show all; otherwise filter
              if (!item.sectionKey) return true;
              if (!allowedSections || allowedSections.length === 0) return true;
              return allowedSections.includes(item.sectionKey);
            })
            .map((item, index) => (
            <Link
              key={index}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground",
                sidebarCollapsed ? "justify-center" : ""
              )}
              title={sidebarCollapsed ? item.title : undefined}
            >
              {item.icon}
              {!sidebarCollapsed && item.title}
            </Link>
          ))}
        </nav>
      </ScrollArea>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:border-r transition-all duration-300",
          sidebarCollapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        <NavItems />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <NavItems />
        </SheetContent>
      </Sheet>
    </>
  );
}
