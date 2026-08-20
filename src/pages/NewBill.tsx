"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Save, Plus, Trash2, Search, UserPlus, User, Package, Gem, Sparkles,
  Calculator, CreditCard, Banknote, Smartphone, Wallet, FileText, Print,
  ArrowLeft, ArrowRight, Minus, X, Check, AlertCircle, Info, RotateCcw
} from "lucide-react";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { format } from "date-fns";

interface Customer {
  id: number;
  name: string;
  mobile?: string;
  address?: string;
}

interface Metal {
  id: number;
  name: string;
  code: string;
}

interface Purity {
  id: number;
  metal_id: number;
  name: string;
  code: string;
  percentage: number;
}

interface ProductPreset {
  id: number;
  english_name: string;
  marathi_name: string;
  metal_id: number;
  purity_id: number;
  making_charge_method: string;
  making_charge_value: number;
  making_charge_per_gram_base: string;
  wastage_base: string;
}

interface CurrentRate {
  id: number;
  metal_id: number;
  purity_id: number;
  rate_per_gram: number;
}

interface InvoiceItem {
  id: string; // temporary ID for new items
  preset_id?: number;
  metal_id: number;
  purity_id: number;
  english_name: string;
  marathi_name?: string;
  gross_weight: number;
  stone_weight: number;
  net_weight: number;
  rate_per_gram: number;
  metal_value: number;
  making_charge_method: string;
  making_charge_value: number;
  making_charge_per_gram_base: string;
  making_charge_amount: number;
  wastage_method: string;
  wastage_value: number;
  wastage_base: string;
  wastage_amount: number;
  stone_value: number;
  other_charges: number;
  discount_method: string;
  discount_value: number;
  discount_amount: number;
  taxable_value: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total_amount: number;
}

interface InvoiceData {
  customer_id?: number;
  invoice_date: string;
  items: InvoiceItem[];
  subtotal: number;
  total_tax: number;
  discount: number;
  rounding: number;
  total_amount: number;
  payment_method: string;
  payment_reference?: string;
  notes?: string;
}

export function NewBill() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [metals, setMetals] = useState<Metal[]>([]);
  const [purities, setPurities] = useState<Purity[]>([]);
  const [presets, setPresets] = useState<ProductPreset[]>([]);
  const [currentRates, setCurrentRates] = useState<CurrentRate[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("items");

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);

  // New item form state
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    preset_id: "",
    metal_id: "",
    purity_id: "",
    english_name: "",
    marathi_name: "",
    gross_weight: "",
    net_weight: "",
    wastage_percentage: "",
    rate_per_gram: "",
    making_charge_method: "PER_GRAM",
    making_charge_value: "",
    making_charge_per_gram_base: "net_weight",
    wastage_base: "metal_value",
    stone_value: "",
    other_charges: "",
  });

  const fetchData = async () => {
    try {
      const [customersData, metalsData, puritiesData, presetsData, ratesData, paymentMethodsData] = await Promise.all([
        ipc.customers.getAll(),
        ipc.metals.getAll(),
        ipc.purities.getAll(),
        ipc.productPresets.getAll(),
        ipc.rates.getCurrent(),
        ipc.paymentMethods.getAll(),
      ]);
      setCustomers(customersData);
      setMetals(metalsData.filter(m => m.active));
      setPurities(puritiesData.filter(p => p.active));
      setPresets(presetsData.filter(p => p.active));
      setCurrentRates(ratesData);
      setPaymentMethods(paymentMethodsData.filter(p => p.active));
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get filtered purities based on selected metal
  const filteredPurities = purities.filter(p => p.metal_id === Number(itemForm.metal_id));

  // Get rate for selected metal/purity
  const getRate = (metalId: number, purityId: number) => {
    const rate = currentRates.find(r => r.metal_id === metalId && r.purity_id === purityId);
    return rate?.rate_per_gram || 0;
  };

  // Get preset details
  const getPreset = (presetId: number) => {
    return presets.find(p => p.id === presetId);
  };

  // Calculate item values - simplified client-side preview (actual calc happens in main process)
  const calculateItem = (form: typeof itemForm): Partial<InvoiceItem> => {
    const grossWeight = Number(form.gross_weight) || 0;
    const stoneWeight = Number(form.stone_weight) || 0;
    const netWeight = grossWeight - stoneWeight;
    const rate = Number(form.rate_per_gram) || 0;
    const metalValue = netWeight * rate;

    let makingCharge = 0;
    const makingChargeValue = Number(form.making_charge_value) || 0;
    const makingChargeBase = form.making_charge_per_gram_base;

    if (form.making_charge_method === "PER_GRAM") {
      makingCharge = makingChargeValue * (makingChargeBase === "gross_weight" ? grossWeight : netWeight);
    } else if (form.making_charge_method === "PERCENTAGE") {
      makingCharge = metalValue * (makingChargeValue / 100);
    } else { // FIXED
      makingCharge = makingChargeValue;
    }

    // Wastage is now based on wastage_method and wastage_value, not percentage
    let wastageAmount = 0;
    const wastageMethod = form.wastage_method || 'NONE';
    const wastageValue = Number(form.wastage_value) || 0;
    const wastageBase = form.wastage_base;

    const baseForWastage = wastageBase === 'metal_value_plus_making' ? metalValue + makingCharge : metalValue;

    if (wastageMethod === 'FIXED') {
      wastageAmount = wastageValue;
    } else if (wastageMethod === 'PERCENTAGE') {
      wastageAmount = baseForWastage * (wastageValue / 100);
    }

    const stoneValue = Number(form.stone_value) || 0;
    const otherCharges = Number(form.other_charges) || 0;
    const taxableValue = metalValue + makingCharge + wastageAmount + stoneValue + otherCharges;

    // Get tax rates from tax settings (using defaults for preview)
    const cgstRate = 1.5; // Default per plan
    const sgstRate = 1.5; // Default per plan
    const cgstAmount = taxableValue * (cgstRate / 100);
    const sgstAmount = taxableValue * (sgstRate / 100);
    const igstAmount = 0;

    const totalAmount = taxableValue + cgstAmount + sgstAmount + igstAmount;

    return {
      gross_weight: grossWeight,
      stone_weight: stoneWeight,
      net_weight: netWeight,
      rate_per_gram: rate,
      metal_value: metalValue,
      making_charge_amount: makingCharge,
      wastage_amount: wastageAmount,
      stone_value: stoneValue,
      other_charges: otherCharges,
      taxable_value: taxableValue,
      cgst_rate: cgstRate,
      cgst_amount: cgstAmount,
      sgst_rate: sgstRate,
      sgst_amount: sgstAmount,
      igst_rate: 0,
      igst_amount: 0,
      total_amount: totalAmount,
    };
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.taxable_value, 0);
  const totalTax = items.reduce((sum, item) => sum + item.cgst_amount + item.sgst_amount + item.igst_amount, 0);
  const totalAmount = subtotal + totalTax - discount;

  // Handle preset selection
  const handlePresetChange = (presetId: string) => {
    setItemForm(prev => ({ ...prev, preset_id: presetId }));
    if (!presetId) return;

    const preset = getPreset(Number(presetId));
    if (!preset) return;

    const rate = getRate(preset.metal_id, preset.purity_id);

    setItemForm(prev => ({
      ...prev,
      metal_id: String(preset.metal_id),
      purity_id: String(preset.purity_id),
      english_name: preset.english_name,
      marathi_name: preset.marathi_name || "",
      making_charge_method: preset.making_charge_method,
      making_charge_value: String(preset.making_charge_value),
      making_charge_per_gram_base: preset.making_charge_per_gram_base,
      wastage_base: preset.wastage_base,
      rate_per_gram: String(rate),
    }));
  };

  // Handle metal change
  const handleMetalChange = (metalId: string) => {
    setItemForm(prev => ({ ...prev, metal_id: metalId, purity_id: "", rate_per_gram: "" }));
    if (!metalId) return;

    const rate = getRate(Number(metalId), Number(itemForm.purity_id));
    setItemForm(prev => ({ ...prev, rate_per_gram: String(rate) }));
  };

  // Handle purity change
  const handlePurityChange = (purityId: string) => {
    setItemForm(prev => ({ ...prev, purity_id: purityId }));
    if (!purityId || !itemForm.metal_id) return;

    const rate = getRate(Number(itemForm.metal_id), Number(purityId));
    setItemForm(prev => ({ ...prev, rate_per_gram: String(rate) }));
  };

  const openNewItemDialog = () => {
    setEditingItemId(null);
    setItemForm({
      preset_id: "",
      metal_id: "",
      purity_id: "",
      english_name: "",
      marathi_name: "",
      gross_weight: "",
      stone_weight: "",
      rate_per_gram: "",
      making_charge_method: "PER_GRAM",
      making_charge_value: "",
      making_charge_per_gram_base: "net_weight",
      wastage_method: "NONE",
      wastage_value: "",
      wastage_base: "metal_value",
      stone_value: "",
      other_charges: "",
      discount_method: "NONE",
      discount_value: "",
    });
    setNewItemDialogOpen(true);
  };

  const openEditItemDialog = (item: InvoiceItem) => {
    setEditingItemId(item.id);
    setItemForm({
      preset_id: String(item.preset_id || ""),
      metal_id: String(item.metal_id),
      purity_id: String(item.purity_id),
      english_name: item.english_name,
      marathi_name: item.marathi_name || "",
      gross_weight: String(item.gross_weight),
      stone_weight: String(item.stone_weight || 0),
      rate_per_gram: String(item.rate_per_gram),
      making_charge_method: item.making_charge_method,
      making_charge_value: String(item.making_charge_value || 0),
      making_charge_per_gram_base: item.making_charge_per_gram_base,
      wastage_method: item.wastage_method || 'NONE',
      wastage_value: String(item.wastage_value || 0),
      wastage_base: item.wastage_base || 'metal_value',
      stone_value: String(item.stone_value || 0),
      other_charges: String(item.other_charges || 0),
      discount_method: item.discount_method || 'NONE',
      discount_value: String(item.discount_value || 0),
    });
    setNewItemDialogOpen(true);
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const calculated = calculateItem(itemForm);
    const metal = metals.find(m => m.id === Number(itemForm.metal_id));
    const purity = purities.find(p => p.id === Number(itemForm.purity_id));

    const newItem: InvoiceItem = {
      id: editingItemId || `item-${Date.now()}`,
      preset_id: itemForm.preset_id ? Number(itemForm.preset_id) : undefined,
      metal_id: Number(itemForm.metal_id),
      purity_id: Number(itemForm.purity_id),
      english_name: itemForm.english_name,
      marathi_name: itemForm.marathi_name,
      ...calculated,
      making_charge_method: itemForm.making_charge_method,
      making_charge_value: Number(itemForm.making_charge_value),
      making_charge_per_gram_base: itemForm.making_charge_per_gram_base,
      wastage_base: itemForm.wastage_base,
    } as InvoiceItem;

    if (editingItemId) {
      setItems(prev => prev.map(item => item.id === editingItemId ? newItem : item));
    } else {
      setItems(prev => [...prev, newItem]);
    }

    setNewItemDialogOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCreateInvoice = async () => {
    if (items.length === 0) {
      alert("Please add at least one item");
      return;
    }

    if (!selectedCustomer) {
      alert("Please select a customer");
      return;
    }

    setSaving(true);
    try {
      // Create draft first
      const draftInput = {
        invoiceDate: invoiceDate,
        customerId: selectedCustomer.id,
        items: items.map(item => ({
          preset_id: item.preset_id,
          metal_id: item.metal_id,
          purity_id: item.purity_id,
          product_name_english: item.english_name,
          product_name_marathi: item.marathi_name,
          hsn_sac: item.hsn_sac || '',
          gross_weight: item.gross_weight,
          stone_weight: item.stone_weight || 0,
          net_weight: item.net_weight,
          metal_rate: item.rate_per_gram,
          making_charge_method: item.making_charge_method,
          making_charge_value: item.making_charge_value || 0,
          making_charge_per_gram_base: item.making_charge_per_gram_base,
          wastage_method: item.wastage_method || 'NONE',
          wastage_value: item.wastage_value || 0,
          wastage_base: item.wastage_base || 'metal_value',
          stone_value: item.stone_value || 0,
          other_charges: item.other_charges ? [{ description: 'Other', amount: item.other_charges, taxable: true }] : [],
          discount_method: item.discount_method || 'NONE',
          discount_value: item.discount_value || 0,
        })),
        payments: paymentMethods.map(pm => ({
          method: pm.method,
          amount: pm.amount,
          reference_number: pm.reference_number || '',
          date: pm.date || invoiceDate,
          notes: pm.notes || '',
        })),
        taxType: 'CGST_SGST' as const,
        roundingMode: 'PER_ITEM' as const,
        invoiceLanguage: 'ENGLISH' as const,
        invoiceDiscountMethod: 'NONE' as const,
        invoiceDiscountValue: 0,
        createdBy: 1, // TODO: Get from auth context
      };

      const draftId = await ipc.invoices.createDraft(draftInput);

      // Then finalize the invoice
      const result = await ipc.invoices.finalizeInvoice(draftId, 1); // TODO: Get from auth context

      if (result) {
        alert(`Invoice ${result.invoiceNumber} created successfully!`);
        // Reset form
        setItems([]);
        setPaymentMethods([{ method: 'CASH', amount: 0, reference_number: '', date: invoiceDate, notes: '' }]);
        setInvoiceDate(format(new Date(), 'yyyy-MM-dd'));
        setSelectedCustomer(null);
      } else {
        alert('Failed to create invoice');
      }
    } catch (error: any) {
      console.error('Create invoice error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.mobile?.toLowerCase().includes(customerSearch.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold tracking-tight">New Bill</h1>
          <p className="text-muted-foreground">Create a new sales invoice</p>
        </div>
        <Button onClick={handleCreateInvoice} disabled={saving || items.length === 0} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Create Invoice
            </>
          )}
        </Button>
      </div>

      {/* Customer & Date Section */}
      <Card>
        <CardHeader>
          <CardTitle>Customer & Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="customer">Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="customer"
                  placeholder="Search or select customer..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onClick={() => setShowCustomerDialog(true)}
                  className="pl-10"
                  readOnly
                />
                {selectedCustomer && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedCustomer.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <p className="text-sm text-muted-foreground mt-1">{selectedCustomer.mobile} • {selectedCustomer.address || "No address"}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input id="invoiceDate" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Dialog open={newItemDialogOpen} onOpenChange={setNewItemDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setNewItemDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
            </Dialog>
            <Button variant="outline" onClick={() => setShowCustomerDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              New Customer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="items">
            <Package className="mr-2 h-4 w-4" />
            Items ({items.length})
          </TabsTrigger>
          <TabsTrigger value="summary">
            <Calculator className="mr-2 h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="payment">
            <CreditCard className="mr-2 h-4 w-4" />
            Payment
          </TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardContent className="pt-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">No items added yet</h3>
                  <p className="text-muted-foreground">Click "Add Item" to start building your invoice</p>
                  <Button onClick={openNewItemDialog} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Item
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Gross Wt</TableHead>
                        <TableHead className="text-right">Net Wt</TableHead>
                        <TableHead className="text-right">Rate/g</TableHead>
                        <TableHead className="text-right">Metal Value</TableHead>
                        <TableHead className="text-right">Making</TableHead>
                        <TableHead className="text-right">Taxable</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.english_name}</p>
                              {item.marathi_name && <p className="text-sm text-muted-foreground">{item.marathi_name}</p>}
                              <p className="text-xs text-muted-foreground">
                                {metals.find(m => m.id === item.metal_id)?.name} - {purities.find(p => p.id === item.purity_id)?.name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(item.gross_weight)} g</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(item.net_weight)} g</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(item.rate_per_gram)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(item.metal_value)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(item.making_charge)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(item.taxable_value)}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(item.total_amount)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditItemDialog(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items Summary */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Items Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No items added</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-primary">{index + 1}</span>
                          <div>
                            <p className="font-medium">{item.english_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatNumber(item.net_weight)}g × {formatCurrency(item.rate_per_gram)}/g
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(item.total_amount)}</p>
                          <p className="text-xs text-muted-foreground">Tax: {formatCurrency(item.cgst_amount + item.sgst_amount + item.igst_amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Tax (CGST + SGST)</span>
                    <span className="font-medium">{formatCurrency(totalTax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span>Grand Total</span>
                    <span className="font-bold">{formatCurrency(subtotal + totalTax)}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="discount">Discount</Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={subtotal + totalTax}
                      value={discount}
                      onChange={(e) => setDiscount(Math.min(Number(e.target.value) || 0, subtotal + totalTax))}
                      className="w-32"
                    />
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Net Payable</span>
                    <span className="text-primary">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.code} value={method.code}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentReference">Reference Number</Label>
                <Input
                  id="paymentReference"
                  placeholder="Transaction ID, Cheque No., UPI Ref, etc."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  placeholder="Any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Item Dialog */}
      <Dialog open={newItemDialogOpen} onOpenChange={setNewItemDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="hidden" onClick={() => setNewItemDialogOpen(true)}>
            Hidden Trigger
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItemId ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>
          <Form onSubmit={handleItemSubmit}>
            <form className="space-y-4">
              {/* Preset Selection */}
              <FormField
                control={{ name: "preset_id", onChange: (e) => handlePresetChange(e.target.value) }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Preset (Optional)</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a preset to auto-fill fields" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">-- Select Preset --</SelectItem>
                          {presets.map((preset) => (
                            <SelectItem key={preset.id} value={String(preset.id)}>
                              {preset.english_name} ({preset.marathi_name || preset.english_name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>Selecting a preset will auto-fill metal, purity, making charges, and rate</FormDescription>
                  </FormItem>
                )}
              />

              <Separator />

              {/* Metal & Purity */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={{ name: "metal_id", onChange: (e) => handleMetalChange(e.target.value) }}
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
                  control={{ name: "purity_id", onChange: (e) => handlePurityChange(e.target.value) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purity *</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!itemForm.metal_id}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select purity" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredPurities.map((purity) => (
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
              </div>

              {/* Item Names */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={{ name: "english_name", onChange: (e) => setItemForm((prev) => ({ ...prev, english_name: e.target.value })) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>English Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Gold Chain" required />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={{ name: "marathi_name", onChange: (e) => setItemForm((prev) => ({ ...prev, marathi_name: e.target.value })) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marathi Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., सोन्याची चेन" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Weights */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={{ name: "gross_weight", onChange: (e) => setItemForm((prev) => ({ ...prev, gross_weight: e.target.value })) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gross Weight (g) *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.001" min="0" placeholder="0.000" required />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={{ name: "stone_weight", onChange: (e) => setItemForm((prev) => ({ ...prev, stone_weight: e.target.value })) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stone Weight (g)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.001" min="0" placeholder="0.000" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={{ name: "rate_per_gram", onChange: (e) => setItemForm((prev) => ({ ...prev, rate_per_gram: e.target.value })) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate/Gram (₹) *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" required />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Making Charges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={{ name: "making_charge_method", onChange: (e) => setItemForm((prev) => ({ ...prev, making_charge_method: e.target.value })) }}
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
                            <SelectItem value="PERCENTAGE">Percentage of Metal Value</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={{ name: "making_charge_value", onChange: (e) => setItemForm((prev) => ({ ...prev, making_charge_value: e.target.value })) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Making Charge Value *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" required />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={{ name: "making_charge_per_gram_base", onChange: (e) => setItemForm((prev) => ({ ...prev, making_charge_per_gram_base: e.target.value })) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Per Gram Base</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={itemForm.making_charge_method !== "PER_GRAM"}>
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
              </div>

              {/* Wastage */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={{ name: "wastage_method", onChange: (e) => setItemForm((prev) => ({ ...prev, wastage_method: e.target.value })) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wastage Method *</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">None</SelectItem>
                            <SelectItem value="FIXED">Fixed Amount</SelectItem>
                            <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={{ name: "wastage_value", onChange: (e) => setItemForm((prev) => ({ ...prev, wastage_value: e.target.value })) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wastage Value *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" required />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={{ name: "wastage_base", onChange: (e) => setItemForm((prev) => ({ ...prev, wastage_base: e.target.value })) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wastage Base</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={itemForm.wastage_method === "NONE"}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select base" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="metal_value">Metal Value</SelectItem>
                            <SelectItem value="metal_value_plus_making">Metal Value + Making Charge</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Stone Value */}
              <FormField
                control={{ name: "stone_value", onChange: (e) => setItemForm((prev) => ({ ...prev, stone_value: e.target.value })) }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stone Value (₹)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={{ name: "other_charges", onChange: (e) => setItemForm((prev) => ({ ...prev, other_charges: e.target.value })) }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Charges (₹)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Preview Calculation */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-3">Calculation Preview</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Net Weight:</span>
                      <span className="ml-2 font-mono font-medium">
                        {(() => {
                          const gw = Number(itemForm.gross_weight) || 0;
                          const sw = Number(itemForm.stone_weight) || 0;
                          return formatNumber(gw - sw);
                        })()} g
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Metal Value:</span>
                      <span className="ml-2 font-mono font-medium">
                        {(() => {
                          const gw = Number(itemForm.gross_weight) || 0;
                          const sw = Number(itemForm.stone_weight) || 0;
                          const rate = Number(itemForm.rate_per_gram) || 0;
                          return formatCurrency((gw - sw) * rate);
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Making Charge:</span>
                      <span className="ml-2 font-mono font-medium">
                        {(() => {
                          const gw = Number(itemForm.gross_weight) || 0;
                          const nw = gw - (Number(itemForm.stone_weight) || 0);
                          const rate = Number(itemForm.rate_per_gram) || 0;
                          const mv = nw * rate;
                          const mcv = Number(itemForm.making_charge_value) || 0;
                          if (itemForm.making_charge_method === "PER_GRAM") {
                            return formatCurrency(mcv * (itemForm.making_charge_per_gram_base === "gross_weight" ? gw : nw));
                          } else if (itemForm.making_charge_method === "PERCENTAGE") {
                            return formatCurrency(mv * (mcv / 100));
                          }
                          return formatCurrency(mcv);
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Est. Total:</span>
                      <span className="ml-2 font-mono font-medium text-primary">
                        {(() => {
                          const calc = calculateItem(itemForm);
                          return formatCurrency(calc.total_amount || 0);
                        })()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNewItemDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItemId ? "Update Item" : "Add Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Customer Selection Dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No customers found</p>
            ) : (
              filteredCustomers.map((customer) => (
                <Button
                  key={customer.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => { setSelectedCustomer(customer); setCustomerSearch(customer.name); setShowCustomerDialog(false); }}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-sm text-muted-foreground">{customer.mobile || "No mobile"}</span>
                  </div>
                </Button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => { setShowCustomerDialog(false); setCustomerDialogOpen(true); }}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create New
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}