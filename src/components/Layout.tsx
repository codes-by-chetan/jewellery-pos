"use client";

import * as React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { LayoutDashboard, Users, Package, ShoppingCart, Settings, History, LogOut, DollarSign, Building2, FileText, HelpCircle, Menu, X, CreditCard, Database, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "New Bill", href: "/new-bill", icon: ShoppingCart },
  { name: "Sales History", href: "/sales-history", icon: History },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Products", href: "/products", icon: Package },
  { name: "Rates", href: "/rates", icon: DollarSign },
  { name: "Shop Settings", href: "/settings/shop", icon: Building2 },
  { name: "Templates", href: "/settings/templates", icon: FileText },
  { name: "Tax Settings", href: "/settings/tax", icon: Settings },
  { name: "Payment Methods", href: "/settings/payments", icon: CreditCard },
  { name: "Backup", href: "/settings/backup", icon: Database },
  { name: "Audit Log", href: "/audit", icon: HelpCircle },
];

export function Layout() {
  const { state, logout } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  const userInitials = state.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  // Calculate sidebar width
  const sidebarWidth = sidebarCollapsed ? "w-16" : "w-64";
  const mainContentPadding = sidebarCollapsed ? "lg:pl-16" : "lg:pl-64";

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative z-50 flex h-full flex-col border-r bg-card transition-all duration-300",
          sidebarWidth,
          mobileSidebarOpen && "translate-x-0 w-64",
          !mobileSidebarOpen && !isDesktop && "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg truncate">Jewellery POS</span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-3 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors overflow-hidden",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    sidebarCollapsed && "justify-center px-2"
                  )
                }
                onClick={() => setMobileSidebarOpen(false)}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        {/* Collapse/Expand Toggle Button (Desktop only) - Hamburger style at bottom */}
        {isDesktop && (
          <div className="absolute bottom-0 left-0 right-0 border-t p-3">
            <Button
              variant="ghost"
              size="icon"
              className="w-full justify-center"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <Menu className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        )}

        {/* Sidebar Footer - User Menu (only when not collapsed on desktop) */}
        {!sidebarCollapsed && (
          <div className="absolute bottom-16 left-0 right-0 border-t p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={state.user?.name || "User"} />
                    <AvatarFallback className="text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{state.user?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{state.user?.role?.toLowerCase() || "user"}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-sm" disabled>
                  {state.user?.username || "username"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-sm text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Collapsed user indicator */}
        {sidebarCollapsed && isDesktop && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-muted flex items-center justify-center border">
            <Avatar className="h-7 w-7">
              <AvatarImage src="" alt={state.user?.name || "User"} />
              <AvatarFallback className="text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className={cn("flex-1 flex flex-col overflow-hidden transition-all duration-300", mainContentPadding)}>
        {/* Top Bar */}
        <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
          <div className="flex h-full items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              </Button>
              <h1 className="text-lg font-semibold truncate">
                {navigation.find((n) => n.href === location.pathname)?.name || "Jewellery POS"}
              </h1>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}