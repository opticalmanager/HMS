"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Pill,
  Receipt,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrencyINR } from "@/utils/formatting";

const MEDICINE_FORMS = [
  "TABLET",
  "CAPSULE",
  "SYRUP",
  "INJECTION",
  "DROPS",
  "OINTMENT",
  "OTHER",
] as const;

const TARIFF_CATEGORIES = [
  "CONSULTATION",
  "LAB",
  "PROCEDURE",
  "DIAGNOSTIC",
  "OTHER",
] as const;

interface MedicineItem {
  id: string;
  brandName: string;
  genericName: string;
  strength: string | null;
  form: string;
  defaultDosage: string | null;
  defaultFrequency: string | null;
  defaultDurationDays: number | null;
  isActive: boolean;
  score?: number;
  needsReview?: boolean;
}

interface TariffItem {
  id: string;
  name: string;
  category: string;
  price: string;
  taxRate: string;
  hsnSacCode: string | null;
  isActive: boolean;
  score?: number;
  needsReview?: boolean;
}

export default function MasterCatalogPage() {
  const [activeTab, setActiveTab] = React.useState<"medicines" | "tariffs">("medicines");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [medicines, setMedicines] = React.useState<MedicineItem[]>([]);
  const [tariffs, setTariffs] = React.useState<TariffItem[]>([]);

  // Add Medicine Dialog
  const [isAddMedOpen, setIsAddMedOpen] = React.useState(false);
  const [medBrand, setMedBrand] = React.useState("");
  const [medGeneric, setMedGeneric] = React.useState("");
  const [medStrength, setMedStrength] = React.useState("");
  const [medForm, setMedForm] = React.useState<string>("TABLET");
  const [medDosage, setMedDosage] = React.useState("");
  const [medFreq, setMedFreq] = React.useState("BD");
  const [medDays, setMedDays] = React.useState(5);
  const [savingMed, setSavingMed] = React.useState(false);

  // Add Tariff Dialog
  const [isAddTariffOpen, setIsAddTariffOpen] = React.useState(false);
  const [tariffName, setTariffName] = React.useState("");
  const [tariffCategory, setTariffCategory] = React.useState<string>("CONSULTATION");
  const [tariffPrice, setTariffPrice] = React.useState("500.00");
  const [tariffTaxRate, setTariffTaxRate] = React.useState("0.00");
  const [tariffHsn, setTariffHsn] = React.useState("998311");
  const [savingTariff, setSavingTariff] = React.useState(false);

  const fetchMedicines = React.useCallback(async (q: string) => {
    try {
      setLoading(true);
      const url = q.trim()
        ? `/api/crm/catalog/medicines?q=${encodeURIComponent(q.trim())}`
        : "/api/crm/catalog/medicines";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMedicines(data.medicines || []);
      }
    } catch {
      toast.error("Failed to load medicine catalog");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTariffs = React.useCallback(async (q: string) => {
    try {
      setLoading(true);
      const url = q.trim()
        ? `/api/crm/catalog/tariffs?q=${encodeURIComponent(q.trim())}`
        : "/api/crm/catalog/tariffs";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTariffs(data.tariffs || []);
      }
    } catch {
      toast.error("Failed to load tariff catalog");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (activeTab === "medicines") {
        fetchMedicines(searchQuery);
      } else {
        fetchTariffs(searchQuery);
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [activeTab, searchQuery, fetchMedicines, fetchTariffs]);

  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingMed(true);
      const res = await fetch("/api/crm/catalog/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: medBrand,
          genericName: medGeneric,
          strength: medStrength || undefined,
          form: medForm,
          defaultDosage: medDosage || undefined,
          defaultFrequency: medFreq || undefined,
          defaultDurationDays: Number(medDays) || undefined,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create medicine");
      }

      toast.success("Medicine added to catalog");
      setIsAddMedOpen(false);
      setMedBrand("");
      setMedGeneric("");
      setMedStrength("");
      fetchMedicines(searchQuery);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating medicine";
      toast.error(msg);
    } finally {
      setSavingMed(false);
    }
  };

  const handleCreateTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingTariff(true);
      const res = await fetch("/api/crm/catalog/tariffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tariffName,
          category: tariffCategory,
          price: tariffPrice,
          taxRate: tariffTaxRate,
          hsnSacCode: tariffHsn || undefined,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create tariff");
      }

      toast.success("Service tariff created successfully");
      setIsAddTariffOpen(false);
      setTariffName("");
      fetchTariffs(searchQuery);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating tariff";
      toast.error(msg);
    } finally {
      setSavingTariff(false);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Subnavigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Master Catalog & Clinical Tariffs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard drug formulary and service tariff charge master with pg_trgm fuzzy matching
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Link
            href="/settings/clinic"
            className="px-2.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-medium"
          >
            Clinic Profile
          </Link>
          <Link
            href="/settings/schedules"
            className="px-2.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-medium"
          >
            Doctor Schedules
          </Link>
          <Link
            href="/settings/catalog"
            className="px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-200"
          >
            Master Catalog
          </Link>
          <Link
            href="/settings/team"
            className="px-2.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-medium"
          >
            Staff & Team
          </Link>
        </div>
      </div>

      {/* Primary Toolbar: Tabs, Fuzzy Search Bar, and Add Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab("medicines");
              setSearchQuery("");
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "medicines"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Pill className="h-3.5 w-3.5" />
            Medicines Master ({medicines.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("tariffs");
              setSearchQuery("");
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "tariffs"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            Service Tariffs ({tariffs.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64 sm:w-80">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Fuzzy search ${activeTab}...`}
              className="h-8 pl-8 text-xs bg-white"
            />
          </div>

          {activeTab === "medicines" ? (
            <Button
              onClick={() => setIsAddMedOpen(true)}
              className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Medicine
            </Button>
          ) : (
            <Button
              onClick={() => setIsAddTariffOpen(true)}
              className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Tariff
            </Button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Searching master catalog...</div>
        ) : activeTab === "medicines" ? (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-700">Brand Name</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Generic Composition</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Form & Strength</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Default Regimen</TableHead>
                {searchQuery.trim() && (
                  <TableHead className="text-xs font-semibold text-slate-700">Fuzzy Match Score</TableHead>
                )}
                <TableHead className="text-xs font-semibold text-slate-700 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                    No medicines found matching &quot;{searchQuery}&quot;. Click &quot;Add Medicine&quot; to expand catalog.
                  </TableCell>
                </TableRow>
              ) : (
                medicines.map((m) => (
                  <TableRow key={m.id} className="py-2.5">
                    <TableCell className="text-xs font-semibold text-slate-900">
                      {m.brandName}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {m.genericName}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium text-slate-800">{m.form}</span>
                      {m.strength && (
                        <span className="text-[11px] text-slate-500 ml-1">({m.strength})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-700">
                      {m.defaultFrequency || "—"} {m.defaultDurationDays ? `x ${m.defaultDurationDays}d` : ""}
                    </TableCell>
                    {searchQuery.trim() && (
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-semibold">
                            {(m.score ?? 0).toFixed(2)}
                          </span>
                          {m.needsReview ? (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] flex items-center gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" /> Needs Review
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] flex items-center gap-0.5">
                              <Sparkles className="h-2.5 w-2.5" /> High Match
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {m.isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-700">Service / Procedure</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Category</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Standard Price</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Tax / SAC</TableHead>
                {searchQuery.trim() && (
                  <TableHead className="text-xs font-semibold text-slate-700">Fuzzy Match Score</TableHead>
                )}
                <TableHead className="text-xs font-semibold text-slate-700 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tariffs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                    No tariffs found matching &quot;{searchQuery}&quot;. Click &quot;Add Tariff&quot; to register new procedures.
                  </TableCell>
                </TableRow>
              ) : (
                tariffs.map((t) => (
                  <TableRow key={t.id} className="py-2.5">
                    <TableCell className="text-xs font-semibold text-slate-900">
                      {t.name}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                        {t.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-900">
                      {formatCurrencyINR(parseFloat(t.price))}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {t.taxRate}% {t.hsnSacCode ? `(SAC ${t.hsnSacCode})` : ""}
                    </TableCell>
                    {searchQuery.trim() && (
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-semibold">
                            {(t.score ?? 0).toFixed(2)}
                          </span>
                          {t.needsReview ? (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] flex items-center gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" /> Needs Review
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] flex items-center gap-0.5">
                              <Sparkles className="h-2.5 w-2.5" /> High Match
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {t.isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add Medicine Modal */}
      <Dialog open={isAddMedOpen} onOpenChange={setIsAddMedOpen}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-slate-900">
              Add Formulary Medicine
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Register an approved outpatient drug into clinic formulary
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMedicine} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Brand Name
                </label>
                <Input
                  value={medBrand}
                  onChange={(e) => setMedBrand(e.target.value)}
                  placeholder="e.g. Augmentin 625 Duo"
                  className="h-9 text-[13px]"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Generic Composition
                </label>
                <Input
                  value={medGeneric}
                  onChange={(e) => setMedGeneric(e.target.value)}
                  placeholder="e.g. Amoxicillin + Clav"
                  className="h-9 text-[13px]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Dosage Form
                </label>
                <select
                  value={medForm}
                  onChange={(e) => setMedForm(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {MEDICINE_FORMS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Strength
                </label>
                <Input
                  value={medStrength}
                  onChange={(e) => setMedStrength(e.target.value)}
                  placeholder="e.g. 625mg or 100ml"
                  className="h-9 text-[13px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Frequency
                </label>
                <select
                  value={medFreq}
                  onChange={(e) => setMedFreq(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="OD">OD (Once daily)</option>
                  <option value="BD">BD (Twice daily)</option>
                  <option value="TDS">TDS (Thrice daily)</option>
                  <option value="SOS">SOS (As needed)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Duration (Days)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={180}
                  value={medDays}
                  onChange={(e) => setMedDays(Number(e.target.value))}
                  className="h-9 text-[13px]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Dosage Note
                </label>
                <Input
                  value={medDosage}
                  onChange={(e) => setMedDosage(e.target.value)}
                  placeholder="e.g. After meals"
                  className="h-9 text-[13px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddMedOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingMed}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {savingMed ? "Adding..." : "Add to Formulary"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Tariff Modal */}
      <Dialog open={isAddTariffOpen} onOpenChange={setIsAddTariffOpen}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-slate-900">
              Add Service Tariff / Charge
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Define standard charge master pricing for consultations & procedures
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTariff} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Procedure / Service Name
              </label>
              <Input
                value={tariffName}
                onChange={(e) => setTariffName(e.target.value)}
                placeholder="e.g. ECG 12-Lead with Report"
                className="h-9 text-[13px]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Category
                </label>
                <select
                  value={tariffCategory}
                  onChange={(e) => setTariffCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {TARIFF_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Standard Rate (INR)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tariffPrice}
                  onChange={(e) => setTariffPrice(e.target.value)}
                  className="h-9 text-[13px]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  GST Rate (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tariffTaxRate}
                  onChange={(e) => setTariffTaxRate(e.target.value)}
                  className="h-9 text-[13px]"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  HSN / SAC Code
                </label>
                <Input
                  value={tariffHsn}
                  onChange={(e) => setTariffHsn(e.target.value)}
                  placeholder="e.g. 998311"
                  className="h-9 text-[13px] font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddTariffOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingTariff}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {savingTariff ? "Creating..." : "Save Service Tariff"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
