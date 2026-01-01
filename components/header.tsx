"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { WelcomeDialog } from "@/components/dashboard/welcome-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TopNavigation } from "@/components/top-navigation";
import { useSidebar } from "@/contexts/sidebar-context";
import { Menu } from "lucide-react";

interface HeaderProps {
  user: {
    name?: string | null;
    username?: string | null;
    role?: string | null;
  };
}

export function Header({ user }: HeaderProps) {
  const { sidebarCollapsed } = useSidebar();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-3 lg:px-6">
      {/* Left: mobile menu button */}
      <div className="flex items-center">
        <Button
          variant="outline"
          size="icon"
          className="md:hidden"
          onClick={() => {
            // Dispatch a global event to open the sidebar sheet
            window.dispatchEvent(new Event("openSidebar"));
          }}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Center: search/navigation */}
      <div className="flex-1 flex items-center justify-center">
        <TopNavigation />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar>
                <AvatarFallback>
                  {user.name ? getInitials(user.name) : "BE"}
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">User menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {user.username}
                </span>
                <span className="text-xs font-medium mt-1">{user.role}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                try {
                  const key = `welcome_shown_${user.username || user.name || "user"}`;
                  window.localStorage.removeItem(key);
                } catch {
                  // ignore storage errors
                }
                signOut({ callbackUrl: "/login" });
              }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <WelcomeDialog username={user.username || user.name || "user"} />
    </header>
  );
}
