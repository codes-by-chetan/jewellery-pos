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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Plus, Edit, Trash2, Copy, FileText, Eye, Globe, Languages, Receipt, Truck, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
  id: number;
  name: string;
  language: "en" | "mr" | "hi";
  type: "invoice" | "receipt" | "quotation" | "delivery_challan";
  content: string;
  is_default: number;
  active: number;
}

export function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    language: "en",
    type: "invoice",
    content: "",
    active: true,
  });
  const [activeTab, setActiveTab] = useState("all");
  const [viewTemplate, setViewTemplate] = useState<Template | null>(null);

  const fetchTemplates = async () => {
    try {
      const data = await ipc.templates.getAll();
      setTemplates(data);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      language: "en",
      type: "invoice",
      content: "",
      active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      language: template.language,
      type: template.type,
      content: template.content,
      active: template.active === 1,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingTemplate) {
        await ipc.templates.update(editingTemplate.id, formData);
      } else {
        await ipc.templates.create(formData);
      }
      setDialogOpen(false);
      fetchTemplates();
    } catch (error: any) {
      alert(error.message || "Failed to save template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await ipc.templates.delete(id);
      fetchTemplates();
    } catch (error: any) {
      alert(error.message || "Failed to delete template");
    }
  };

  const handleDuplicate = async (id: number) => {
    const template = templates.find(t => t.id === id);
    if (!template) return;

    try {
      await ipc.templates.create({
        ...template,
        name: `${template.name} (Copy)`,
        is_default: 0,
      });
      fetchTemplates();
    } catch (error: any) {
      alert(error.message || "Failed to duplicate template");
    }
  };

  const handleSetDefault = async (template: Template) => {
    // This would need a set default endpoint
    alert("Set as default functionality needs to be implemented");
  };

  const openViewDialog = (template: Template) => {
    setViewTemplate(template);
  };

  const filteredTemplates = templates.filter((template) => {
    if (activeTab === "invoice") return template.type === "invoice";
    if (activeTab === "receipt") return template.type === "receipt";
    if (activeTab === "quotation") return template.type === "quotation";
    if (activeTab === "delivery") return template.type === "delivery_challan";
    return true;
  });

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
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">Manage invoice, receipt, and document templates</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Template
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="receipt">Receipt</TabsTrigger>
          <TabsTrigger value="quotation">Quotation</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <TemplatesTable templates={filteredTemplates} onEdit={openEditDialog} onDelete={handleDelete} onDuplicate={handleDuplicate} onSetDefault={handleSetDefault} onView={openViewDialog} />
        </TabsContent>
        <TabsContent value="invoice" className="space-y-4">
          <TemplatesTable templates={filteredTemplates} onEdit={openEditDialog} onDelete={handleDelete} onDuplicate={handleDuplicate} onSetDefault={handleSetDefault} onView={openViewDialog} />
        </TabsContent>
        <TabsContent value="receipt" className="space-y-4">
          <TemplatesTable templates={filteredTemplates} onEdit={openEditDialog} onDelete={handleDelete} onDuplicate={handleDuplicate} onSetDefault={handleSetDefault} onView={openViewDialog} />
        </TabsContent>
        <TabsContent value="quotation" className="space-y-4">
          <TemplatesTable templates={filteredTemplates} onEdit={openEditDialog} onDelete={handleDelete} onDuplicate={handleDuplicate} onSetDefault={handleSetDefault} onView={openViewDialog} />
        </TabsContent>
        <TabsContent value="delivery" className="space-y-4">
          <TemplatesTable templates={filteredTemplates} onEdit={openEditDialog} onDelete={handleDelete} onDuplicate={handleDuplicate} onSetDefault={handleSetDefault} onView={openViewDialog} />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>
              Use placeholders like {{shop_name}}, {{invoice_number}}, {{customer_name}}, {{items}}, {{total_amount}}, etc.
            </DialogDescription>
          </DialogHeader>
          <Form onSubmit={handleSubmit}>
            <form className="space-y-4 h-[calc(100%-200px)] flex flex-col">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={{ name: "name", onChange: (e) => setFormData((prev) => ({ ...prev, name: e.target.value })) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Standard Invoice" required />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={{ name: "language", onChange: (e) => setFormData((prev) => ({ ...prev, language: e.target.value })) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language *</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="mr">Marathi</SelectItem>
                            <SelectItem value="hi">Hindi</SelectItem>
                          </SelectContent>
                        </Select>
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
                            <SelectItem value="invoice">Invoice</SelectItem>
                            <SelectItem value="receipt">Receipt</SelectItem>
                            <SelectItem value="quotation">Quotation</SelectItem>
                            <SelectItem value="delivery_challan">Delivery Challan</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={{ name: "content", onChange: (e) => setFormData((prev) => ({ ...prev, content: e.target.value })) }}
                render={({ field }) => (
                  <FormItem className="flex-1 flex flex-col">
                    <FormLabel>Template Content (HTML) *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="font-mono text-sm flex-1 min-h-[300px] resize-none"
                        placeholder="Enter HTML template content..."
                        required
                      />
                    </FormControl>
                    <FormDescription>
                      Available placeholders: {{shop_name}}, {{shop_address}}, {{shop_phone}}, {{shop_email}}, {{shop_gstin}}, {{invoice_number}}, {{invoice_date}}, {{customer_name}}, {{customer_address}}, {{customer_phone}}, {{items}}, {{subtotal}}, {{tax_amount}}, {{total_amount}}, {{terms_conditions}}
                    </FormDescription>
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
                    "Save Template"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Template Dialog */}
      <Dialog open={!!viewTemplate} onOpenChange={(open) => !open && setViewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{viewTemplate?.name}</DialogTitle>
            <DialogDescription>
              {viewTemplate?.language} • {viewTemplate?.type} • {viewTemplate?.is_default ? "Default" : "Custom"}
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-md h-[500px] overflow-auto p-4 bg-muted/50">
            <div dangerouslySetInnerHTML={{ __html: viewTemplate?.content || "" }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTemplate(null)}>
              Close
            </Button>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(viewTemplate?.content || "")}>
              <Copy className="mr-2 h-4 w-4" />
              Copy HTML
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplatesTable({
  templates,
  onEdit,
  onDelete,
  onDuplicate,
  onSetDefault,
  onView,
}: {
  templates: Template[];
  onEdit: (template: Template) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  onSetDefault: (template: Template) => void;
  onView: (template: Template) => void;
}) {
  const typeIcons = {
    invoice: FileText,
    receipt: Receipt,
    quotation: FileText,
    delivery_challan: Truck,
  };

  return (
    <Card>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No templates found
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => {
                  const Icon = typeIcons[template.type as keyof typeof typeIcons] || FileText;
                  return (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          template.language === "en" ? "bg-blue-100 text-blue-800" :
                          template.language === "mr" ? "bg-green-100 text-green-800" :
                          "bg-orange-100 text-orange-800"
                        )}>
                          {template.language.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {template.type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.is_default ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
                            Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          template.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        )}>
                          {template.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onView(template)} title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onEdit(template)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDuplicate(template.id)} title="Duplicate">
                            <Copy className="h-4 w-4" />
                          </Button>
                          {!template.is_default && (
                            <Button variant="ghost" size="icon" onClick={() => onSetDefault(template)} title="Set as Default">
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => onDelete(template.id)} title="Delete">
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
      </CardContent>
    </Card>
  );
}