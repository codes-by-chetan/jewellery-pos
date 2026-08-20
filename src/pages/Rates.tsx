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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Edit, Loader2, History, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface CurrentRate {
  id: number;
  metal_id: number;
  purity_id: number;
  rate_per_gram: number;
  effective_date: string;
  effective_time: string;
  source: string;
}

interface RateHistory {
  id: number;
  metal_id: number;
  purity_id: number;
  rate_per_gram: number;
  effective_date: string;
  effective_time: string;
  source: string;
}

export function Rates() {
  const [metals, setMetals] = useState<Metal[]>([]);
  const [purities, setPurities] = useState<Purity[]>([]);
  const [currentRates, setCurrentRates] = useState<CurrentRate[]>([]);
  const [rateHistory, setRateHistory] = useState<RateHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("current");
  const [selectedMetal, setSelectedMetal] = useState("");
  const [selectedPurity, setSelectedPurity] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<CurrentRate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    metal_id: "",
    purity_id: "",
    rate_per_gram: "",
    source: "MANUAL",
    effective_date: new Date().toISOString().split("T")[0],
    effective_time: new Date().toTimeString().slice(0, 5),
  });

  const fetchData = async () => {
    try {
      const [metalsData, currentRatesData] = await Promise.all([
        ipc.metals.getAll(),
        ipc.rates.getCurrent(),
      ]);
      setMetals(metalsData);
      setCurrentRates(currentRatesData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPurities = async (metalId: number) => {
    try {
      const puritiesData = await ipc.purities.getByMetal(metalId);
      setPurities(puritiesData);
    } catch (error) {
      console.error("Failed to fetch purities:", error);
    }
  };

  const fetchRateHistory = async (metalId: number, purityId: number) => {
    try {
      const history = await ipc.rates.getHistory(metalId, purityId);
      setRateHistory(history);
    } catch (error) {
      console.error("Failed to fetch rate history:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedMetal) {
      fetchPurities(Number(selectedMetal));
    } else {
      setPurities([]);
    }
    setSelectedPurity("");
  }, [selectedMetal]);

  useEffect(() => {
    if (selectedMetal && selectedPurity) {
      fetchRateHistory(Number(selectedMetal), Number(selectedPurity));
    } else {
      setRateHistory([]);
    }
  }, [selectedMetal, selectedPurity]);

  const openCreateDialog = () => {
    setEditingRate(null);
    setFormData({
      metal_id: "",
      purity_id: "",
      rate_per_gram: "",
      source: "MANUAL",
      effective_date: new Date().toISOString().split("T")[0],
      effective_time: new Date().toTimeString().slice(0, 5),
    });
    setDialogOpen(true);
  };

  const openEditDialog = (rate: CurrentRate) => {
    setEditingRate(rate);
    setFormData({
      metal_id: String(rate.metal_id),
      purity_id: String(rate.purity_id),
      rate_per_gram: String(rate.rate_per_gram),
      source: rate.source,
      effective_date: rate.effective_date,
      effective_time: rate.effective_time,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await ipc.rates.setRate({
        metal_id: Number(formData.metal_id),
        purity_id: Number(formData.purity_id),
        rate_per_gram: Number(formData.rate_per_gram),
        source: formData.source,
        effective_date: formData.effective_date,
        effective_time: formData.effective_time,
      });
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      alert(error.message || "Failed to save rate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleMetalChange = (metalId: string) => {
    setSelectedMetal(metalId);
    setFormData((prev) => ({ ...prev, metal_id: metalId, purity_id: "" }));
  };

  const handlePurityChange = (purityId: string) => {
    setSelectedPurity(purityId);
    setFormData((prev) => ({ ...prev, purity_id: purityId }));
  };

  const filteredCurrentRates = currentRates.filter((rate) => {
    if (selectedMetal && Number(rate.metal_id) !== Number(selectedMetal)) return false;
    if (selectedPurity && Number(rate.purity_id) !== Number(selectedPurity)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rates</h1>
          <p className="text-muted-foreground">Manage current metal rates and view history</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Set Rate
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="metal">Metal</Label>
              <Select onValueChange={handleMetalChange} defaultValue={selectedMetal}>
                <SelectTrigger>
                  <SelectValue placeholder="Select metal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Metals</SelectItem>
                  {metals.map((metal) => (
                    <SelectItem key={metal.id} value={String(metal.id)}>
                      {metal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="purity">Purity</Label>
              <Select onValueChange={handlePurityChange} defaultValue={selectedPurity} disabled={!selectedMetal}>
                <SelectTrigger>
                  <SelectValue placeholder="Select purity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Purities</SelectItem>
                  {purities.map((purity) => (
                    <SelectItem key={purity.id} value={String(purity.id)}>
                      {purity.name} ({purity.percentage}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2 sm:flex-none">
              <Label>Quick Actions</Label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fetchData()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">
            Current Rates
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Rate History
          </TabsTrigger>
        </TabsList>

        {/* Current Rates Tab */}
        <TabsContent value="current" className="space-y-4">
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
                        <TableHead>Metal</TableHead>
                        <TableHead>Purity</TableHead>
                        <TableHead className="text-right">Rate/Gram</TableHead>
                        <TableHead>Effective Date</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCurrentRates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No rates found. Set a new rate to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCurrentRates.map((rate) => {
                          const metal = metals.find(m => m.id === rate.metal_id);
                          const purity = purities.find(p => p.id === rate.purity_id);
                          return (
                            <TableRow key={rate.id}>
                              <TableCell className="font-medium">{metal?.name || "-"}</TableCell>
                              <TableCell>{purity?.name || "-"}</TableCell>
                              <TableCell className="text-right font-mono font-semibold text-lg">₹{Number(rate.rate_per_gram).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell>{rate.effective_date} {rate.effective_time}</TableCell>
                              <TableCell>
                                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  rate.source === "MANUAL" ? "bg-blue-100 text-blue-800" :
                                  rate.source === "API" ? "bg-green-100 text-green-800" :
                                  "bg-gray-100 text-gray-800"
                                )}>
                                  {rate.source}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(rate)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
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

        {/* Rate History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate History</CardTitle>
              <CardDescription>
                {selectedMetal && selectedPurity
                  ? `Showing history for ${metals.find(m => m.id === Number(selectedMetal))?.name} - ${purities.find(p => p.id === Number(selectedPurity))?.name}`
                  : "Select a metal and purity to view rate history"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rate/Gram</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rateHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No history available
                          </TableCell>
                        </TableRow>
                      ) : (
                        rateHistory.map((rate, index) => {
                          const prevRate = rateHistory[index + 1];
                          const change = prevRate
                            ? Number(rate.rate_per_gram) - Number(prevRate.rate_per_gram)
                            : 0;
                          return (
                            <TableRow key={rate.id}>
                              <TableCell className="font-mono font-semibold text-lg">₹{Number(rate.rate_per_gram).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell>{rate.effective_date}</TableCell>
                              <TableCell>{rate.effective_time}</TableCell>
                              <TableCell>
                                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  rate.source === "MANUAL" ? "bg-blue-100 text-blue-800" :
                                  rate.source === "API" ? "bg-green-100 text-green-800" :
                                  "bg-gray-100 text-gray-800"
                                )}>
                                  {rate.source}
                                </span>
                              </TableCell>
                              <TableCell>
                                {index < rateHistory.length - 1 && (
                                  <span className={cn("flex items-center gap-1 font-medium",
                                    change > 0 ? "text-green-600" :
                                    change < 0 ? "text-red-600" :
                                    "text-gray-600"
                                  )}>
                                    {change > 0 ? <TrendingUp className="h-4 w-4" /> : change < 0 ? <TrendingDown className="h-4 w-4" /> : null}
                                    {change !== 0 ? `₹${Math.abs(change).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                                  </span>
                                )}
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

      {/* Add/Edit Rate Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRate ? "Edit Rate" : "Set New Rate"}</DialogTitle>
            <DialogDescription>
              {editingRate ? "Update the rate information below." : "Enter the new rate details."}
            </DialogDescription>
          </DialogHeader>
          <Form onSubmit={handleSubmit}>
            <form className="space-y-4">
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
                control={{ name: "purity_id", onChange: handleChange }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purity *</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!formData.metal_id}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select purity" />
                        </SelectTrigger>
                        <SelectContent>
                          {purities.map((purity) => (
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
                control={{ name: "rate_per_gram", onChange: handleChange }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate per Gram (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="Enter rate per gram"
                        required
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={{ name: "source", onChange: handleChange }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANUAL">Manual Entry</SelectItem>
                          <SelectItem value="API">API Feed</SelectItem>
                          <SelectItem value="MARKET">Market Rate</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={{ name: "effective_date", onChange: handleChange }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective Date *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" required />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={{ name: "effective_time", onChange: handleChange }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective Time *</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" required />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
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
                    "Save Rate"
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