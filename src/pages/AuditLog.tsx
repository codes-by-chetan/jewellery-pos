"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { ipc } from "@/lib/ipc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Filter, Eye, Download, Database, User, FileText, ShoppingCart, Settings, Trash2, Edit, Plus, LogOut, Clock, RotateCcw, CreditCard, Gem, Sparkles, Package, Percent, Receipt, Truck } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

interface AuditLog {
  id: number;
  user_id?: number;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  description?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      const data = await ipc.audit.getAll({
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: searchQuery || undefined,
        limit: 500,
      });
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter, dateFrom, dateTo, searchQuery]);

  const actionColors: Record<string, string> = {
    USER_CREATED: "bg-green-100 text-green-800",
    USER_UPDATED: "bg-blue-100 text-blue-800",
    USER_DELETED: "bg-red-100 text-red-800",
    USER_LOGIN: "bg-purple-100 text-purple-800",
    USER_LOGOUT: "bg-gray-100 text-gray-800",
    INVOICE_CREATED: "bg-blue-100 text-blue-800",
    INVOICE_UPDATED: "bg-yellow-100 text-yellow-800",
    INVOICE_DELETED: "bg-red-100 text-red-800",
    INVOICE_FINALIZED: "bg-green-100 text-green-800",
    INVOICE_CANCELLED: "bg-red-100 text-red-800",
    INVOICE_RETURNED: "bg-orange-100 text-orange-800",
    CUSTOMER_CREATED: "bg-green-100 text-green-800",
    CUSTOMER_UPDATED: "bg-blue-100 text-blue-800",
    CUSTOMER_DELETED: "bg-red-100 text-red-800",
    SETTINGS_UPDATED: "bg-yellow-100 text-yellow-800",
    BACKUP_CREATED: "bg-purple-100 text-purple-800",
    BACKUP_RESTORED: "bg-purple-100 text-purple-800",
    RATE_UPDATED: "bg-indigo-100 text-indigo-800",
    TEMPLATE_CREATED: "bg-teal-100 text-teal-800",
    TEMPLATE_UPDATED: "bg-teal-100 text-teal-800",
    TEMPLATE_DELETED: "bg-red-100 text-red-800",
  };

  const entityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    user: User,
    invoice: FileText,
    customer: ShoppingCart,
    shop: Settings,
    rate: Database,
    template: FileText,
    backup: Database,
    payment_method: CreditCard,
    metal: Gem,
    purity: Sparkles,
    product_preset: Package,
    tax: Percent,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();
  const uniqueEntities = [...new Set(logs.map(l => l.entity_type))].sort();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">Track all system activities and changes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={fetchLogs}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Actions</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="entity">Entity Type</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Entities</SelectItem>
                  {uniqueEntities.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity.charAt(0).toUpperCase() + entity.slice(1).replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <User className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unique Users</p>
                <p className="text-2xl font-bold">{[...new Set(logs.map(l => l.user_id).filter(Boolean))].length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Activities</p>
                <p className="text-2xl font-bold">
                  {logs.filter(l => l.created_at.startsWith(new Date().toISOString().split("T")[0])).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Settings className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Settings Changes</p>
                <p className="text-2xl font-bold">
                  {logs.filter(l => l.action.includes("SETTINGS") || l.action.includes("UPDATED")).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Date & Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="w-[180px]">Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[120px]">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{log.user_name || "System"}</span>
                          {log.user_id && <span className="text-xs text-muted-foreground">(#{log.user_id})</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", actionColors[log.action] || "bg-gray-100 text-gray-800")}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium capitalize">{log.entity_type.replace(/_/g, " ")}</TableCell>
                      <TableCell className="font-mono text-sm">{log.entity_id || "-"}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{log.description || "-"}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{log.ip_address || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Audit Log Details</DialogTitle>
              <DialogDescription>
                {selectedLog.action.replace(/_/g, " ")} • {formatDateTime(selectedLog.created_at)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-mono">{selectedLog.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Action</p>
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium", actionColors[selectedLog.action] || "bg-gray-100 text-gray-800")}>
                    {selectedLog.action.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entity Type</p>
                  <p className="capitalize">{selectedLog.entity_type.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entity ID</p>
                  <p className="font-mono">{selectedLog.entity_id || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="font-medium">{selectedLog.user_name || "System"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p>{formatDateTime(selectedLog.created_at)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="font-mono">{selectedLog.ip_address || "Unknown"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p>{selectedLog.description || "No description provided"}</p>
                </div>
                {selectedLog.user_agent && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">User Agent</p>
                    <p className="font-mono text-xs break-all">{selectedLog.user_agent}</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}