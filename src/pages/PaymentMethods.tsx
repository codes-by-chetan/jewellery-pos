"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { ipc } from "@/lib/ipc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Plus, Edit, Trash2, CreditCard, Banknote, Smartphone, Wallet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentMethod {
  code: string;
  name: string;
  type: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";
  requires_reference: number;
  active: number;
  sort_order: number;
}

export function PaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "CASH",
    requires_reference: false,
    active: true,
    sort_order: 0,
  });

  const fetchMethods = async () => {
    try {
      const data = await ipc.paymentMethods.getAll();
      setMethods(data);
    } catch (error) {
      console.error("Failed to fetch payment methods:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const openCreateDialog = () => {
    setEditingMethod(null);
    setFormData({
      code: "",
      name: "",
      type: "CASH",
      requires_reference: false,
      active: true,
      sort_order: methods.length,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      code: method.code,
      name: method.name,
      type: method.type,
      requires_reference: method.requires_reference === 1,
      active: method.active === 1,
      sort_order: method.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        type: formData.type,
        requires_reference: formData.requires_reference ? 1 : 0,
        active: formData.active ? 1 : 0,
        sort_order: formData.sort_order,
      };

      if (editingMethod) {
        await ipc.paymentMethods.update(editingMethod.code, payload);
      } else {
        await ipc.paymentMethods.create(payload);
      }
      setDialogOpen(false);
      fetchMethods();
    } catch (error: any) {
      alert(error.message || "Failed to save payment method");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm("Are you sure you want to delete this payment method?")) return;

    try {
      await ipc.paymentMethods.delete(code);
      fetchMethods();
    } catch (error: any) {
      alert(error.message || "Failed to delete payment method");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const typeIcons = {
    CASH: Banknote,
    CARD: CreditCard,
    UPI: Smartphone,
    BANK_TRANSFER: Wallet,
    CHEQUE: FileText,
    OTHER: Settings,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Methods</h1>
          <p className="text-muted-foreground">Configure accepted payment methods</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Payment Method
        </Button>
      </div>

      {/* Payment Methods Table */}
      <Card>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Requires Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sort Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {methods.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No payment methods configured. Add methods to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    methods.map((method) => {
                      const Icon = typeIcons[method.type as keyof typeof typeIcons] || Settings;
                      return (
                        <TableRow key={method.code}>
                          <TableCell className="font-mono font-medium">{method.code}</TableCell>
                          <TableCell className="font-medium">{method.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                method.type === "CASH" ? "bg-green-100 text-green-800" :
                                method.type === "CARD" ? "bg-blue-100 text-blue-800" :
                                method.type === "UPI" ? "bg-purple-100 text-purple-800" :
                                method.type === "BANK_TRANSFER" ? "bg-indigo-100 text-indigo-800" :
                                "bg-gray-100 text-gray-800"
                              )}>
                                {method.type}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              method.requires_reference ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                            )}>
                              {method.requires_reference ? "Yes" : "No"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              method.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            )}>
                              {method.active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell>{method.sort_order}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(method)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(method.code)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Payment Method Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMethod ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle>
          </DialogHeader>
          <Form onSubmit={handleSubmit}>
            <form className="space-y-4">
              {editingMethod ? (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input value={formData.code} disabled className="bg-muted" />
                  </FormControl>
                  <FormDescription>Code cannot be changed after creation</FormDescription>
                </FormItem>
              ) : (
                <FormField
                  control={{ name: "code", onChange: handleChange }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., CASH, CARD, UPI" maxLength={20} required />
                      </FormControl>
                      <FormDescription>Unique identifier (uppercase, no spaces)</FormDescription>
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={{ name: "name", onChange: handleChange }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Cash Payment" required />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={{ name: "type", onChange: handleChange }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="CARD">Card (Credit/Debit)</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={{ name: "sort_order", onChange: handleChange }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" />
                    </FormControl>
                    <FormDescription>Display order (lower numbers appear first)</FormDescription>
                  </FormItem>
                )}
              />
              <FormItem className="flex items-center space-x-3">
                <FormControl>
                  <Switch
                    checked={formData.requires_reference}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, requires_reference: checked }))}
                  />
                </FormControl>
                <FormLabel>Requires Reference Number</FormLabel>
              </FormItem>
              <FormItem className="flex items-center space-x-3">
                <FormControl>
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, active: checked }))}
                  />
                </FormControl>
                <FormLabel>Active</FormLabel>
              </FormItem>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}