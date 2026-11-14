"use client";

import * as React from "react";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Wallet,
  ArrowDownCircle,
  Lock,
  Printer,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InvoiceBuilder } from "@/components/billing/InvoiceBuilder";
import { ThermalReceiptModal } from "@/components/billing/ThermalReceiptModal";
import { useClinicalStore, clinicalStore } from "@/services/clinical-store";
import { formatCurrencyINR, formatClinicalDate } from "@/utils/formatting";
import type { Invoice } from "@/types/hms";

export default function BillingPage() {
  const store = useClinicalStore();
  const [activeTab, setActiveTab] = React.useState("create");
  const [search, setSearch] = React.useState("");

  const [selectedInvoiceForThermal, setSelectedInvoiceForThermal] = React.useState<Invoice | null>(null);
  const [thermalOpen, setThermalOpen] = React.useState(false);

  // Cashier Drawer Drop Dialog state
  const [dropAmount, setDropAmount] = React.useState<number>(5000);
  const [dropReason, setDropReason] = React.useState("Routine vault drop");
  const [countedCash, setCountedCash] = React.useState<number>(8640);

  const drawer = store.cashierShift;
  const invoicesList = store.invoices;

  const handleOpenThermal = (inv: Invoice) => {
    setSelectedInvoiceForThermal(inv);
    setThermalOpen(true);
  };

  const handleRecordDrop = () => {
    if (dropAmount <= 0) return;
    clinicalStore.recordCashDrop(dropAmount, dropReason);
    alert(`Safe cash drop of ₹${dropAmount} recorded in shift log!`);
  };

  const handleCloseShift = () => {
    const confirmClose = confirm(
      `Close shift drawer for ${drawer.cashierName}? Counted: ₹${countedCash}, Expected: ₹${drawer.expectedCashTotal}`
    );
    if (confirmClose) {
      clinicalStore.closeCashierShift(countedCash);
      alert("Shift drawer reconciled and closed successfully.");
    }
  };

  const filteredInvoices = invoicesList.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.patientName.toLowerCase().includes(search.toLowerCase()) ||
      inv.paymentMode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing & Invoicing</h1>
          <p className="text-xs text-slate-500">
            OPD & IPD invoices, thermal POS receipts, GST breakdowns, and cashier shift drawer
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="create">New Invoice</TabsTrigger>
              <TabsTrigger value="history">Invoice Register ({invoicesList.length})</TabsTrigger>
              <TabsTrigger value="drawer">Cashier Shift Drawer</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {activeTab === "create" ? (
        <InvoiceBuilder
          patientName="Ramesh Patel"
          patientPhone="9823012345"
          uhid="UHID-2026-0041"
        />
      ) : activeTab === "history" ? (
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Hospital Invoices Register</CardTitle>
              <p className="text-xs text-slate-500">All billed outpatient and inpatient tax invoices</p>
            </div>

            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice #, patient..."
                className="pl-9 h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead className="text-right">Total (₹)</TableHead>
                  <TableHead className="text-right">Paid (₹)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Thermal POS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-bold text-[#2563EB] text-xs">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatClinicalDate(inv.createdAt)}</TableCell>
                    <TableCell className="font-semibold text-slate-900 text-xs">{inv.patientName}</TableCell>
                    <TableCell className="uppercase text-xs font-mono">{inv.invoiceType}</TableCell>
                    <TableCell className="text-xs font-medium text-slate-600 uppercase">{inv.paymentMode}</TableCell>
                    <TableCell className="text-right font-bold text-slate-900 text-xs">
                      {formatCurrencyINR(inv.grandTotal)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-bold text-xs">
                      {formatCurrencyINR(inv.amountPaid)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={inv.paymentStatus === "paid" ? "success" : "warning"}>
                        {inv.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenThermal(inv)}
                        className="h-7 text-xs gap-1"
                      >
                        <Printer className="h-3 w-3" /> 80mm
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Tab 3: Cashier Shift Drawer Management */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-500">Opening Cash Float</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {formatCurrencyINR(drawer.openingCashFloat)}
                </div>
                <span className="text-[10px] text-slate-400">Drawer ID: {drawer.id}</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-500">Cash Collected Today</span>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {formatCurrencyINR(drawer.cashCollections)}
                </div>
                <span className="text-[10px] text-slate-400">By {drawer.cashierName}</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-500">Digital (UPI + Card)</span>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {formatCurrencyINR(drawer.upiCollections + drawer.cardCollections)}
                </div>
                <span className="text-[10px] text-slate-400">UPI: {formatCurrencyINR(drawer.upiCollections)}</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-500">Expected Cash in Drawer</span>
                <div className="text-2xl font-bold text-indigo-600 mt-1">
                  {formatCurrencyINR(drawer.expectedCashTotal)}
                </div>
                <span className="text-[10px] text-slate-400">Minus Drops: {formatCurrencyINR(drawer.cashDrops)}</span>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Record Mid-Shift Safe Drop */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-amber-500" />
                  Mid-Shift Safe Cash Drop
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Drop Amount (₹)</label>
                  <Input
                    type="number"
                    value={dropAmount}
                    onChange={(e) => setDropAmount(parseFloat(e.target.value) || 0)}
                    className="font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Reason / Destination</label>
                  <Input
                    value={dropReason}
                    onChange={(e) => setDropReason(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleRecordDrop}
                  className="bg-amber-600 hover:bg-amber-700 text-xs w-full font-bold"
                >
                  Record Cash Drop
                </Button>
              </CardContent>
            </Card>

            {/* Shift Closing & Count Reconciliation */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-purple-600" />
                  Shift Handover & Reconciliation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Physical Cash Counted (₹)</label>
                  <Input
                    type="number"
                    value={countedCash}
                    onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                    className="font-mono font-bold text-base"
                  />
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">System Expected Cash:</span>
                    <span className="font-bold">{formatCurrencyINR(drawer.expectedCashTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Variance (Over/Short):</span>
                    <span className={`font-bold ${countedCash - drawer.expectedCashTotal === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatCurrencyINR(countedCash - drawer.expectedCashTotal)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleCloseShift}
                  disabled={drawer.status === "closed"}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs w-full font-bold"
                >
                  {drawer.status === "closed" ? "Shift Drawer Closed" : "Reconcile & Close Cashier Shift"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 80mm ESC/POS Thermal Receipt Modal */}
      <ThermalReceiptModal
        open={thermalOpen}
        onOpenChange={setThermalOpen}
        invoice={selectedInvoiceForThermal}
      />
    </div>
  );
}
