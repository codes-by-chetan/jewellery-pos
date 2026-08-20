"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { ipc } from "@/lib/ipc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Building2, Mail, Phone, MapPin, Globe, Printer, Shield, Settings, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShopSettings {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  license_number?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  terms_conditions?: string;
  invoice_prefix?: string;
  invoice_footer?: string;
  logo_url?: string;
  currency?: string;
  timezone?: string;
  language?: string;
}

export function ShopSettings() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const fetchSettings = async () => {
    try {
      const data = await ipc.shop.getSettings();
      if (data) setSettings(data);
    } catch (error) {
      console.error("Failed to fetch shop settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => prev ? { ...prev, [name]: value } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    try {
      await ipc.shop.updateSettings(settings);
      alert("Settings saved successfully!");
    } catch (error: any) {
      alert(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
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
          <h1 className="text-3xl font-bold tracking-tight">Shop Settings</h1>
          <p className="text-muted-foreground">Configure your shop information and preferences</p>
        </div>
      </div>

      <Form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">
              <Building2 className="mr-2 h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="contact">
              <Mail className="mr-2 h-4 w-4" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="business">
              <Shield className="mr-2 h-4 w-4" />
              Business
            </TabsTrigger>
            <TabsTrigger value="invoice">
              <FileText className="mr-2 h-4 w-4" />
              Invoice
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Essential shop details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={{ name: "name", onChange: handleChange }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter shop name" required />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={{ name: "invoice_prefix", onChange: handleChange }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Prefix</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., INV-" />
                      </FormControl>
                      <FormDescription>Prefix for invoice numbers (e.g., INV-2024-001)</FormDescription>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={{ name: "currency", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                              <SelectItem value="USD">USD - US Dollar</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "language", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
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
                </div>
                <FormField
                  control={{ name: "timezone", onChange: handleChange }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                            <SelectItem value="UTC">UTC</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>How customers can reach you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={{ name: "address", onChange: handleChange }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter full address" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={{ name: "city", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="City" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "state", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="State" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "pincode", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Pincode" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={{ name: "phone", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" placeholder="Enter phone number" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "email", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="Enter email address" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Tab */}
          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Details</CardTitle>
                <CardDescription>Legal and banking information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={{ name: "gstin", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GSTIN</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter GSTIN" maxLength={15} />
                        </FormControl>
                        <FormDescription>15-digit GST Identification Number</FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={{ name: "pan", onChange: handleChange }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PAN</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter PAN" maxLength={10} />
                        </FormControl>
                        <FormDescription>10-digit Permanent Account Number</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={{ name: "license_number", onChange: handleChange }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter trade license number" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="space-y-4">
                  <FormLabel className="block">Bank Details</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={{ name: "bank_name", onChange: handleChange }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Bank name" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={{ name: "account_number", onChange: handleChange }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Account number" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={{ name: "ifsc_code", onChange: handleChange }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IFSC Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="IFSC code" maxLength={11} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <FormField
                  control={{ name: "upi_id", onChange: handleChange }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UPI ID</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter UPI ID (e.g., shop@upi)" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoice Tab */}
          <TabsContent value="invoice" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Customization</CardTitle>
                <CardDescription>Customize invoice appearance and content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={{ name: "invoice_footer", onChange: handleChange }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Footer</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter footer text for invoices" />
                      </FormControl>
                      <FormDescription>Text to appear at the bottom of every invoice</FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={{ name: "terms_conditions", onChange: handleChange }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terms & Conditions</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={4}
                          className="flex h-auto min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Enter terms and conditions"
                        />
                      </FormControl>
                      <FormDescription>Terms and conditions to print on invoices</FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={isSaving} size="lg">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </Form>
    </div>
  );
}