"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { ipc } from "@/lib/ipc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Download, Trash2, RotateCcw, Shield, Clock, HardDrive, Settings, FileText } from "lucide-react";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";

interface BackupFile {
  name: string;
  size: number;
  created_at: string;
}

interface BackupSettings {
  auto_backup_enabled: number;
  backup_interval_hours: number;
  max_backups: number;
  backup_path: string;
  compress_backups: number;
}

export function Backup() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const fetchData = async () => {
    try {
      const [backupsData, settingsData] = await Promise.all([
        ipc.backup.listBackups(),
        ipc.backup.getSettings(),
      ]);
      setBackups(backupsData);
      setSettings(settingsData);
    } catch (error) {
      console.error("Failed to fetch backup data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const result = await ipc.backup.createBackup();
      alert(`Backup created: ${result.filename}`);
      fetchData();
    } catch (error: any) {
      alert(error.message || "Failed to create backup");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      // This would need a download endpoint in the IPC
      alert("Download functionality needs to be implemented");
    } catch (error: any) {
      alert(error.message || "Failed to download backup");
    }
  };

  const handleRestore = async (filename: string) => {
    if (!confirm(`Are you sure you want to restore from ${filename}? This will overwrite current data.`)) return;

    try {
      await ipc.backup.restoreBackup(filename);
      alert("Backup restored successfully. Please restart the application.");
    } catch (error: any) {
      alert(error.message || "Failed to restore backup");
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

    try {
      await ipc.backup.deleteBackup(filename);
      fetchData();
    } catch (error: any) {
      alert(error.message || "Failed to delete backup");
    }
  };

  const handleSettingsChange = (name: string, value: any) => {
    setSettings((prev) => prev ? { ...prev, [name]: value } : null);
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSavingSettings(true);
    try {
      await ipc.backup.updateSettings(settings);
      alert("Backup settings saved successfully!");
      setSettingsDialogOpen(false);
    } catch (error: any) {
      alert(error.message || "Failed to save settings");
    } finally {
      setIsSavingSettings(false);
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
          <h1 className="text-3xl font-bold tracking-tight">Backup & Restore</h1>
          <p className="text-muted-foreground">Manage database backups and restore points</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSettingsDialogOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button onClick={handleCreateBackup} disabled={isCreating}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {isCreating ? "Creating..." : "Create Backup"}
          </Button>
        </div>
      </div>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Backups</CardTitle>
          <CardDescription>Click restore to revert to a previous backup point</CardDescription>
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
                    <TableHead>Filename</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No backups found. Create your first backup to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    backups.map((backup) => (
                      <TableRow key={backup.name}>
                        <TableCell className="font-mono text-sm">{backup.name}</TableCell>
                        <TableCell>{formatNumber(backup.size)} bytes</TableCell>
                        <TableCell>{formatDateTime(backup.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleDownload(backup.name)} title="Download">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleRestore(backup.name)} title="Restore">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(backup.name)} title="Delete">
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

      {/* Backup Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <HardDrive className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Backups</p>
                <p className="text-2xl font-bold">{backups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Size</p>
                <p className="text-2xl font-bold">{formatNumber(backups.reduce((sum, b) => sum + b.size, 0))} bytes</p>
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
                <p className="text-sm text-muted-foreground">Latest Backup</p>
                <p className="text-lg font-bold">{backups[0] ? formatDateTime(backups[0].created_at) : "Never"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Backup Settings</DialogTitle>
            <DialogDescription>Configure automatic backup behavior</DialogDescription>
          </DialogHeader>
          <Form onSubmit={handleSettingsSubmit} className="space-y-4">
              <FormItem className="flex items-center space-x-3">
                <FormControl>
                  <Switch
                    checked={settings?.auto_backup_enabled === 1}
                    onCheckedChange={(checked) => handleSettingsChange("auto_backup_enabled", checked ? 1 : 0)}
                  />
                </FormControl>
                <FormLabel>Enable Automatic Backups</FormLabel>
              </FormItem>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={{ name: "backup_interval_hours", onChange: (e) => handleSettingsChange("backup_interval_hours", Number(e.target.value)) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Backup Interval (hours)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" max="168" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={{ name: "max_backups", onChange: (e) => handleSettingsChange("max_backups", Number(e.target.value)) }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Backups to Keep</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" max="100" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={{ name: "backup_path", onChange: (e) => handleSettingsChange("backup_path", e.target.value) }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Backup Path</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="/path/to/backups" />
                    </FormControl>
                    <FormDescription>Leave empty for default app data directory</FormDescription>
                  </FormItem>
                )}
              />
              <FormItem className="flex items-center space-x-3">
                <FormControl>
                  <Switch
                    checked={settings?.compress_backups === 1}
                    onCheckedChange={(checked) => handleSettingsChange("compress_backups", checked ? 1 : 0)}
                  />
                </FormControl>
                <FormLabel>Compress Backups</FormLabel>
              </FormItem>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSettingsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingSettings}>
                  {isSavingSettings ? (
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
              </DialogFooter>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}