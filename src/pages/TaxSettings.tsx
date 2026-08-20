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
import { Loader2, Save, Plus, Edit, Trash2, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaxRate {
  id: number;
  name: string;
  rate: number;
  type: "CGST" | "SGST" | "IGST" | "CESS";
  description?: string;
  active: number;
}

interface TaxSettings {
  gst_enabled: number;
  default_tax_type: string;
  inclusive_pricing: number;
  rounding_method: string;
}

export function TaxSettings() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [settings, setSettings] = useState<TaxSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxRate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rate: "",
    type: "CGST",
    description: "",
    active: true,
  });

  const fetchData = async () => {
    try {
      const [taxSettings, taxRatesData] = await Promise.all([
        ipc.tax.getSettings(),
        ipc.tax.getDefault(),
      ]);
      setSettings(taxSettings);
      setTaxRates(taxRatesData);
    } catch (error) {
      console.error("Failed to fetch tax data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateDialog = () => {
    setEditingTax(null);
    setFormData({ name: "", rate: "", type: "CGST", description: "", active: true });
    setDialogOpen(true);
  };

  const openEditDialog = (tax: TaxRate) => {
    setEditingTax(tax);
    setFormData({
      name: tax.name,
      rate: String(tax.rate),
      type: tax.type,
      description: tax.description || "",
      active: tax.active === 1,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingTax) {
        // Update tax rate - need to add update endpoint
        alert("Update not implemented yet");
      } else {
        // Create tax rate - need to add create endpoint
        alert("Create not implemented yet");
      }
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      alert(error.message || "Failed to save tax rate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this tax rate?")) return;
    // Need to add delete endpoint
    alert("Delete not implemented yet");
  };

  const handleSettingsChange = (name: string, value: any) => {
    setSettings((prev) => prev ? { ...prev, [name]: value } : null);
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await ipc.tax.updateSettings(settings);
      alert("Settings saved successfully!");
    } catch (error: any) {
      alert(error.message || "Failed to save settings");
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Tax Settings</h1>
          <p className="text-muted-foreground">Configure GST rates and tax behavior</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tax Rate
        </Button>
      </div>

      {/* General Tax Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Configure overall tax behavior for your shop</CardDescription>
        </CardHeader>
        <CardContent>
          <Form onSubmit={handleSettingsSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={{ name: "gst_enabled", onChange: (e) => handleSettingsChange("gst_enabled", e.target.checked ? 1 : 0) }}
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-3">
                    <FormControl>
                      <Switch
                        {...field}
                        checked={settings?.gst_enabled === 1}
                        onCheckedChange={(checked) => handleSettingsChange("gst_enabled", checked ? 1 : 0)}
                      />
                    </FormControl>
                    <FormLabel>Enable GST</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={{ name: "inclusive_pricing", onChange: (e) => handleSettingsChange("inclusive_pricing", e.target.checked ? 1 : 0) }}
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-3">
                    <FormControl>
                      <Switch
                        {...field}
                        checked={settings?.inclusive_pricing === 1}
                        onCheckedChange={(checked) => handleSettingsChange("inclusive_pricing", checked ? 1 : 0)}
                      />
                    </FormControl>
                    <FormLabel>Inclusive Pricing</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={{ name: "default_tax_type", onChange: (e) => handleSettingsChange("default_tax_type", e.target.value) }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Tax Type</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CGST+SGST">CGST + SGST (Intra-state)</SelectItem>
                          <SelectItem value="IGST">IGST (Inter-state)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={{ name: "rounding_method", onChange: (e) => handleSettingsChange("rounding_method", e.target.value) }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rounding Method</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NORMAL">Normal (0.5 up)</SelectItem>
                          <SelectItem value="UP">Always Up</SelectItem>
                          <SelectItem value="DOWN">Always Down</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Save General Settings
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* Tax Rates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tax Rates</CardTitle>
            <CardDescription>Manage individual GST tax rates</CardDescription>
          </div>
        </CardHeader>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxRates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No tax rates configured. Add tax rates to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    taxRates.map((tax) => (
                      <TableRow key={tax.id}>
                        <TableCell className="font-medium">{tax.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            {tax.rate}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            tax.type === "CGST" ? "bg-blue-100 text-blue-800" :
                            tax.type === "SGST" ? "bg-green-100 text-green-800" :
                            tax.type === "IGST" ? "bg-purple-100 text-purple-800" :
                            "bg-orange-100 text-orange-800"
                          )}>
                            {tax.type}
                          </span>
                        </TableCell>
                        <TableCell>{tax.description || "-"}</TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            tax.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          )}>
                            {tax.active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(tax)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(tax.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Tax Rate Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTax ? "Edit Tax Rate" : "Add Tax Rate"}</DialogTitle>
          </DialogHeader>
          <Form onSubmit={handleSubmit}>
            <form className="space-y-4">
              <FormField
                control={{ name: "name", onChange: (e) => setFormData((prev) => ({ ...prev, name: e.target.value })) }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., CGST 9%" required />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={{ name: "rate", onChange: (e) => setFormData((prev) => ({ ...prev, rate: e.target.value })) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate (%) *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="9" required />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={{ name: "type", onChange: (e) => setFormData((prev) => ({ ...prev, type: e.target.value })) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CGST">CGST</SelectItem>
                            <SelectItem value="SGST">SGST</SelectItem>
                            <SelectItem value="IGST">IGST</SelectItem>
                            <SelectItem value="CESS">CESS</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={{ name: "description", onChange: (e) => setFormData((prev) => ({ ...prev, description: e.target.value })) }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional description" />
                    </FormControl>
                  </FormItem>
                )}
              />
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