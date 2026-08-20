"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Users, Package, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, FileText, Clock, CreditCard, User, Plus, Settings, ArrowRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { ipc } from "@/lib/ipc";
import { format } from "date-fns";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconColor: string;
  href?: string;
}

function StatCard({ title, value, change, changeLabel, icon, iconColor, href }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", iconColor)}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {change !== undefined && (
          <div className="flex items-center gap-1">
            {change >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
            <span className={cn("text-sm font-medium", change >= 0 ? "text-green-600" : "text-red-600")}>
              {Math.abs(change)}%
            </span>
            <span className="text-sm text-muted-foreground">{changeLabel || "vs last month"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayInvoices: 0,
    totalCustomers: 0,
    totalProducts: 0,
    recentInvoices: [] as any[],
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [salesData, customersData, invoicesData, metalsData, puritiesData, presetsData] = await Promise.all([
        ipc.invoices.getSalesHistory({ date_from: format(new Date(), "yyyy-MM-dd"), limit: 100 }),
        ipc.customers.getAll(),
        ipc.invoices.getSalesHistory({ limit: 5 }),
        ipc.metals.getAll(),
        ipc.purities.getAll(),
        ipc.productPresets.getAll(),
      ]);

      const todaySales = salesData.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);
      const todayInvoices = salesData.length;
      const totalCustomers = customersData.length;
      const totalProducts = metalsData.length + puritiesData.length + presetsData.length;

      setStats({
        todaySales,
        todayInvoices,
        totalCustomers,
        totalProducts,
        recentInvoices: invoicesData,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Loading...</p>
                  <p className="text-3xl font-bold tracking-tight">—</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-muted" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboardData}>
            <Loader2 className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(stats.todaySales)}
          icon={<ShoppingCart className="h-6 w-6" />}
          iconColor="bg-green-100 text-green-600"
        />
        <StatCard
          title="Today's Invoices"
          value={stats.todayInvoices}
          icon={<FileText className="h-6 w-6" />}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon={<Users className="h-6 w-6" />}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={<Package className="h-6 w-6" />}
          iconColor="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Quick Actions & Recent Invoices */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => window.location.href = "#/new-bill"}>
              <Plus className="h-4 w-4" />
              <span>Create New Invoice</span>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => window.location.href = "#/customers"}>
              <User className="h-4 w-4" />
              <span>Add New Customer</span>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => window.location.href = "#/products"}>
              <Package className="h-4 w-4" />
              <span>Manage Products</span>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => window.location.href = "#/rates"}>
              <DollarSign className="h-4 w-4" />
              <span>Update Rates</span>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => window.location.href = "#/sales-history"}>
              <Clock className="h-4 w-4" />
              <span>View Sales History</span>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => window.location.href = "#/settings/shop"}>
              <Settings className="h-4 w-4" />
              <span>Shop Settings</span>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Latest sales transactions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "#/sales-history"}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No invoices yet</h3>
                <p className="text-muted-foreground">Create your first invoice to get started</p>
                <Button className="mt-4" onClick={() => window.location.href = "#/new-bill"}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Invoice
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentInvoices.map((invoice: any) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">#{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">{invoice.customer_name} • {format(new Date(invoice.invoice_date), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(invoice.total_amount)}</p>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        invoice.status === "finalized" ? "bg-green-100 text-green-800" :
                        invoice.status === "draft" ? "bg-yellow-100 text-yellow-800" :
                        invoice.status === "cancelled" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      )}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}