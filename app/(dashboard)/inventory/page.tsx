"use client";

import * as React from "react";
import { Pill, Plus, Search, AlertTriangle, CheckCircle2, SlidersHorizontal, PackagePlus, ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GrnModal } from "@/components/inventory/GrnModal";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import { useClinicalStore } from "@/services/clinical-store";
import { formatCurrencyINR } from "@/utils/formatting";
import type { InventoryItem } from "@/types/hms";

export default function InventoryPage() {
  const store = useClinicalStore();
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [expiryFilter, setExpiryFilter] = React.useState<string>("all");

  const [grnModalOpen, setGrnModalOpen] = React.useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = React.useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = React.useState<InventoryItem | null>(null);

  const items = store.inventory;
  const today = new Date();

  // Evaluate near expiry
  const nearExpiryItems = items.filter((item) => {
    const exp = new Date(item.expiryDate);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 90 && diffDays >= 0;
  });

  const lowStockItems = items.filter((i) => i.quantityInStock <= i.reorderLevel);

  const filtered = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.genericName?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.batchNumber.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

    let matchesExpiry = true;
    if (expiryFilter !== "all") {
      const exp = new Date(item.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (expiryFilter === "30") matchesExpiry = diffDays <= 30;
      else if (expiryFilter === "60") matchesExpiry = diffDays <= 60;
      else if (expiryFilter === "90") matchesExpiry = diffDays <= 90;
    }

    return matchesSearch && matchesCategory && matchesExpiry;
  });

  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedItemForAdjust(item);
    setAdjustModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pharmacy & Inventory</h1>
          <p className="text-xs text-slate-500">
            Medicine catalog, batch & expiry monitoring, Goods Received Notes (GRN), and stock corrections
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setGrnModalOpen(true)}
            className="bg-[#2563EB] hover:bg-blue-700 text-xs gap-1.5 font-semibold"
          >
            <PackagePlus className="h-3.5 w-3.5" /> Inward Stock / New GRN
          </Button>
        </div>
      </div>

      {/* Expiry and Low Stock Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-900">
                {nearExpiryItems.length} Batches Nearing Expiry (&le; 90 Days)
              </div>
              <div className="text-[11px] text-amber-700">
                Action required to prevent write-offs (e.g. Amoxicillin 500mg Batch BTH-6620)
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpiryFilter(expiryFilter === "30" ? "all" : "30")}
            className="h-7 text-xs border-amber-300 text-amber-900"
          >
            {expiryFilter === "30" ? "Show All" : "Filter &lt; 30d"}
          </Button>
        </div>

        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-rose-900">
                {lowStockItems.length} Items Below Minimum Reorder Level
              </div>
              <div className="text-[11px] text-rose-700">
                Amlodipine 5mg has only 25 units remaining (Minimum threshold 60)
              </div>
            </div>
          </div>
          <Badge variant="danger">Low Stock</Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by drug brand, generic name, batch, or SKU..."
            className="pl-9 text-xs h-9"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-slate-200 bg-white text-xs text-slate-700"
        >
          <option value="all">All Formulations</option>
          <option value="tablet">Tablets & Capsules</option>
          <option value="syrup">Oral Syrups</option>
          <option value="injection">Injections / IV</option>
          <option value="consumable">Consumables</option>
        </select>

        <select
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-slate-200 bg-white text-xs text-slate-700 font-medium"
        >
          <option value="all">All Expiries</option>
          <option value="30">Critical Expiry (&lt; 30 Days)</option>
          <option value="60">Near Expiry (&lt; 60 Days)</option>
          <option value="90">Threshold (&lt; 90 Days)</option>
        </select>
      </div>

      {/* Inventory Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Medicine Name</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead className="text-right">In Stock</TableHead>
              <TableHead className="text-right">Reorder Min</TableHead>
              <TableHead className="text-right">Purchase (₹)</TableHead>
              <TableHead className="text-right">MRP (₹)</TableHead>
              <TableHead>Rack</TableHead>
              <TableHead className="text-right">Adjust</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => {
              const isLow = item.quantityInStock <= item.reorderLevel;
              const exp = new Date(item.expiryDate);
              const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isNearExp = diffDays <= 60;

              return (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-semibold text-slate-600">
                    {item.sku}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900 text-xs">{item.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {item.genericName} • {item.manufacturer}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-700">{item.batchNumber}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${isNearExp ? "text-rose-600 font-bold" : "text-slate-700"}`}>
                      {item.expiryDate}
                    </span>
                    {isNearExp && (
                      <span className="block text-[10px] text-rose-500 font-semibold">
                        ({diffDays}d left)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold text-xs">
                    <span className={isLow ? "text-rose-600 font-extrabold" : "text-slate-900"}>
                      {item.quantityInStock}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-400 font-mono">{item.reorderLevel}</TableCell>
                  <TableCell className="text-right text-xs text-slate-600 font-mono">
                    {formatCurrencyINR(item.purchasePrice)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900 text-xs font-mono">
                    {formatCurrencyINR(item.sellingPrice)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-medium">{item.rackLocation}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAdjust(item)}
                      className="h-7 text-xs gap-1 border-slate-300"
                    >
                      <SlidersHorizontal className="h-3 w-3" /> Adjust
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* GRN Modal */}
      <GrnModal
        open={grnModalOpen}
        onOpenChange={setGrnModalOpen}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        open={adjustModalOpen}
        onOpenChange={setAdjustModalOpen}
        selectedItem={selectedItemForAdjust}
      />
    </div>
  );
}
