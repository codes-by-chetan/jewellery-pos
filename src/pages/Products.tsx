"use client";

import * as React from "react";
import { useState } from "react";
import { ipc } from "@/lib/ipc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Edit, Trash2, Loader2, Gem, Sparkles, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface Metal {
  id: number;
  name: string;
  code: string;
  active: number;
}

interface Purity {
  id: number;
  metal_id: number;
  name: string;
  code: string;
  percentage: number;
  active: number;
}

interface ProductPreset {
  id: number;
  english_name: string;
  marathi_name: string;
  metal_id: number;
  purity_id: number;
  hsn_sac: string;
  making_charge_method: string;
  making_charge_value: number;
  making_charge_per_gram_base: string;
  wastage_base: string;
  active: number;
}

export function Products() {
  const [activeTab, setActiveTab] = useState("metals");
  const [metals, setMetals] = useState<Metal[]>([]);
  const [purities, setPurities] = useState<Purity[]>([]);
  const [presets, setPresets] = useState<ProductPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    percentage: "",
    metal_id: "",
    english_name: "",
    marathi_name: "",
    hsn_sac: "",
    making_charge_method: "PER_GRAM",
    making_charge_value: "",
    making_charge_per_gram_base: "net_weight",
    wastage_base: "metal_value",
  });

  const fetchData = async () => {
    try {
      const [metalsData, puritiesData, presetsData] = await Promise.all([
        ipc.metals.getAll(),
        ipc.purities.getAll(),
        ipc.productPresets.getAll(),
      ]);
      setMetals(metalsData);
      setPurities(puritiesData);
      setPresets(presetsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const openCreateDialog = (type: string) => {
    setEditingItem(null);
    if (type === "metal") {
      setFormData({ name: "", code: "", percentage: "", metal_id: "", english_name: "", marathi_name: "", hsn_sac: "", making_charge_method: "PER_GRAM", making_charge_value: "", making_charge_per_gram_base: "net_weight", wastage_base: "metal_value" });
    } else if (type === "purity") {
      setFormData({ name: "", code: "", percentage: "", metal_id: "", english_name: "", marathi_name: "", hsn_sac: "", making_charge_method: "PER_GRAM", making_charge_value: "", making_charge_per_gram_base: "net_weight", wastage_base: "metal_value" });
    } else if (type === "preset") {
      setFormData({ name: "", code: "", percentage: "", metal_id: "", english_name: "", marathi_name: "", hsn_sac: "", making_charge_method: "PER_GRAM", making_charge_value: "", making_charge_per_gram_base: "net_weight", wastage_base: "metal_value" });
    }
    setDialogOpen(true);
  };

  const openEditDialog = (item: any, type: string) => {
    setEditingItem({ ...item, type });
    if (type === "metal") {
      setFormData({ name: item.name, code: item.code, percentage: "", metal_id: "", english_name: "", marathi_name: "", hsn_sac: "", making_charge_method: "PER_GRAM", making_charge_value: "", making_charge_per_gram_base: "net_weight", wastage_base: "metal_value" });
    } else if (type === "purity") {
      setFormData({ name: item.name, code: item.code, percentage: String(item.percentage), metal_id: String(item.metal_id), english_name: "", marathi_name: "", hsn_sac: "", making_charge_method: "PER_GRAM", making_charge_value: "", making_charge_per_gram_base: "net_weight", wastage_base: "metal_value" });
    } else if (type === "preset") {
      setFormData({ name: "", code: "", percentage: "", metal_id: String(item.metal_id), english_name: item.english_name || "", marathi_name: item.marathi_name || "", hsn_sac: item.hsn_sac || "", making_charge_method: item.making_charge_method, making_charge_value: String(item.making_charge_value), making_charge_per_gram_base: item.making_charge_per_gram_base, wastage_base: item.wastage_base });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { type, id } = editingItem || {};

      if (type === "metal") {
        if (id) {
          await ipc.metals.update(id, { name: formData.name, code: formData.code });
        } else {
          await ipc.metals.create({ name: formData.name, code: formData.code });
        }
      } else if (type === "purity") {
        if (id) {
          await ipc.purities.update(id, { name: formData.name, code: formData.code, percentage: Number(formData.percentage), metal_id: Number(formData.metal_id) });
        } else {
          await ipc.purities.create({ name: formData.name, code: formData.code, percentage: Number(formData.percentage), metal_id: Number(formData.metal_id) });
        }
      } else if (type === "preset") {
        if (id) {
          await ipc.productPresets.update(id, {
            english_name: formData.english_name,
            marathi_name: formData.marathi_name,
            metal_id: Number(formData.metal_id),
            purity_id: Number(formData.purity_id),
            hsn_sac: formData.hsn_sac,
            making_charge_method: formData.making_charge_method,
            making_charge_value: Number(formData.making_charge_value),
            making_charge_per_gram_base: formData.making_charge_per_gram_base,
            wastage_base: formData.wastage_base,
          });
        } else {
          await ipc.productPresets.create({
            english_name: formData.english_name,
            marathi_name: formData.marathi_name,
            metal_id: Number(formData.metal_id),
            purity_id: Number(formData.purity_id),
            hsn_sac: formData.hsn_sac,
            making_charge_method: formData.making_charge_method,
            making_charge_value: Number(formData.making_charge_value),
            making_charge_per_gram_base: formData.making_charge_per_gram_base,
            wastage_base: formData.wastage_base,
          });
        }
      }
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      alert(error.message || "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, type: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      if (type === "metal") await ipc.metals.delete(id);
      else if (type === "purity") await ipc.purities.delete(id);
      else if (type === "preset") await ipc.productPresets.delete(id);
      fetchData();
    } catch (error: any) {
      alert(error.message || "Failed to delete");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const filteredMetals = metals.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPurities = purities.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPresets = presets.filter((p) =>
    (p.english_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.marathi_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage metals, purities, and product presets</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metals">
            <Gem className="mr-2 h-4 w-4" />
            Metals
          </TabsTrigger>
          <TabsTrigger value="purities">
            <Sparkles className="mr-2 h-4 w-4" />
            Purities
          </TabsTrigger>
          <TabsTrigger value="presets">
            <Package className="mr-2 h-4 w-4" />
            Presets
          </TabsTrigger>
        </TabsList>

        {/* Metals Tab */}
        <TabsContent value="metals" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search metals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => openCreateDialog("metal")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Metal
            </Button>
          </div>

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
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMetals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No metals found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMetals.map((metal) => (
                          <TableRow key={metal.id}>
                            <TableCell className="font-medium">{metal.name}</TableCell>
                            <TableCell>{metal.code}</TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                metal.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                              )}>
                                {metal.active ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(metal, "metal")}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(metal.id, "metal")}>
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
        </TabsContent>

        {/* Purities Tab */}
        <TabsContent value="purities" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search purities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => openCreateDialog("purity")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Purity
            </Button>
          </div>

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
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Metal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPurities.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No purities found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPurities.map((purity) => {
                          const metal = metals.find(m => m.id === purity.metal_id);
                          return (
                            <TableRow key={purity.id}>
                              <TableCell className="font-medium">{purity.name}</TableCell>
                              <TableCell>{purity.code}</TableCell>
                              <TableCell>{purity.percentage}%</TableCell>
                              <TableCell>{metal?.name || "-"}</TableCell>
                              <TableCell>
                                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  purity.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                )}>
                                  {purity.active ? "Active" : "Inactive"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(purity, "purity")}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(purity.id, "purity")}>
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
        </TabsContent>

        {/* Presets Tab */}
        <TabsContent value="presets" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search presets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => openCreateDialog("preset")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Preset
            </Button>
          </div>

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
                        <TableHead>English Name</TableHead>
                        <TableHead>Marathi Name</TableHead>
                        <TableHead>Metal</TableHead>
                        <TableHead>Purity</TableHead>
                        <TableHead>Making Charge</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPresets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No presets found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPresets.map((preset) => {
                          const metal = metals.find(m => m.id === preset.metal_id);
                          const purity = purities.find(p => p.id === preset.purity_id);
                          return (
                            <TableRow key={preset.id}>
                              <TableCell className="font-medium">{preset.english_name || "-"}</TableCell>
                              <TableCell>{preset.marathi_name || "-"}</TableCell>
                              <TableCell>{metal?.name || "-"}</TableCell>
                              <TableCell>{purity?.name || "-"}</TableCell>
                              <TableCell>
                                {preset.making_charge_method} ₹{preset.making_charge_value}
                              </TableCell>
                              <TableCell>
                                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  preset.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                )}>
                                  {preset.active ? "Active" : "Inactive"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(preset, "preset")}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(preset.id, "preset")}>
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
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit ${editingItem.type.charAt(0).toUpperCase() + editingItem.type.slice(1)}` : `Add ${activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(1, -1)}`}</DialogTitle>
          </DialogHeader>
          <Form onSubmit={handleSubmit}>
            <form className="space-y-4">
              {(activeTab === "metals" || editingItem?.type === "metal") && (
                <div className="space-y-4">
                  <FormField
                    control={{ name: "name", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter metal name" required />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "code", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter code (e.g., GOLD)" required />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {(activeTab === "purities" || editingItem?.type === "purity") && (
                <div className="space-y-4">
                  <FormField
                    control={{ name: "metal_id", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Metal *</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select metal" />
                            </SelectTrigger>
                            <SelectContent>
                              {metals.map((metal) => (
                                <SelectItem key={metal.id} value={String(metal.id)}>
                                  {metal.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "name", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter purity name (e.g., 22K)" required />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "code", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter code (e.g., 22K)" required />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "percentage", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentage *</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.1" placeholder="Enter percentage (e.g., 91.6)" required />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {(activeTab === "presets" || editingItem?.type === "preset") && (
                <div className="space-y-4">
                  <FormField
                    control={{ name: "metal_id", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Metal *</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select metal" />
                            </SelectTrigger>
                            <SelectContent>
                              {metals.filter(m => m.active).map((metal) => (
                                <SelectItem key={metal.id} value={String(metal.id)}>
                                  {metal.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "purity_id", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purity *</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select purity" />
                            </SelectTrigger>
                            <SelectContent>
                              {purities.filter(p => p.active && p.metal_id === Number(formData.metal_id)).map((purity) => (
                                <SelectItem key={purity.id} value={String(purity.id)}>
                                  {purity.name} ({purity.percentage}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "english_name", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>English Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter English name" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "marathi_name", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marathi Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter Marathi name" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "hsn_sac", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HSN/SAC</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter HSN/SAC code" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "making_charge_method", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Making Charge Method *</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FIXED">Fixed Amount</SelectItem>
                              <SelectItem value="PER_GRAM">Per Gram</SelectItem>
                              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "making_charge_value", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Making Charge Value *</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="Enter value" required />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "making_charge_per_gram_base", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Per Gram Base</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select base" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="net_weight">Net Weight</SelectItem>
                              <SelectItem value="gross_weight">Gross Weight</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "wastage_base", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wastage Base</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select base" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="metal_value">Metal Value</SelectItem>
                              <SelectItem value="metal_value_plus_making">Metal Value + Making</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}

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