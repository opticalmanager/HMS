"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Printer,
  Shield,
  Save,
  CheckCircle,
  QrCode,
  Sliders,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  CalendarDays,
  BookOpen,
  Users,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { SettingsNav } from "@/components/shell/SettingsNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useClinicalStore, clinicalStore } from "@/services/clinical-store";
import { validateGstin, getStateFromGstin } from "@/utils/gstin";
import { formatCurrencyINR } from "@/utils/formatting";

export default function SettingsPage() {
  const store = useClinicalStore();
  const settings = store.settings;
  const sampleDoctor = store.staff.find((s) => s.role.includes("doctor") || s.role.includes("consultant")) || {
    name: "Consulting Physician",
    license: "MCI-VALIDATED",
  };

  // Branch Profile & GSTIN
  const [hospitalName, setHospitalName] = React.useState(settings.hospitalName);
  const [tagline, setTagline] = React.useState(settings.tagline);
  const [regNo, setRegNo] = React.useState(settings.registrationNumber);
  const [phone, setPhone] = React.useState(settings.phone);
  const [email, setEmail] = React.useState(settings.email);
  const [address, setAddress] = React.useState(settings.address);
  const [gstin, setGstin] = React.useState(settings.gstin);
  const [stateCode, setStateCode] = React.useState(settings.stateCode);

  // Letterhead Designer Properties
  const [topMarginMm, setTopMarginMm] = React.useState(settings.letterheadConfig.topMarginMm);
  const [bottomMarginMm, setBottomMarginMm] = React.useState(settings.letterheadConfig.bottomMarginMm);
  const [footerText, setFooterText] = React.useState(settings.letterheadConfig.footerText);
  const [showQrCode, setShowQrCode] = React.useState(settings.letterheadConfig.showQrCode);
  const [showDoctorCredentials, setShowDoctorCredentials] = React.useState(settings.letterheadConfig.showDoctorCredentials);

  // Document sequences
  const [uhidPrefix, setUhidPrefix] = React.useState(settings.documentSequences.uhidPrefix);
  const [opdBillPrefix, setOpdBillPrefix] = React.useState(settings.documentSequences.opdBillPrefix);
  const [ipdPrefix, setIpdPrefix] = React.useState(settings.documentSequences.ipdPrefix);
  const [pharmacyPrefix, setPharmacyPrefix] = React.useState(settings.documentSequences.pharmacyPrefix);
  const [invPrefix, setInvPrefix] = React.useState(settings.documentSequences.invPrefix);

  // Service Catalog
  const [newService, setNewService] = React.useState({
    serviceCode: "",
    name: "",
    category: "procedure" as const,
    standardRate: 500,
    gstRate: 0,
  });

  const [saved, setSaved] = React.useState(false);

  // Live GSTIN Validation Check
  const isGstinValid = React.useMemo(() => validateGstin(gstin), [gstin]);
  const gstinState = React.useMemo(() => getStateFromGstin(gstin), [gstin]);

  const handleSaveAll = () => {
    clinicalStore.updateSettings({
      hospitalName,
      tagline,
      registrationNumber: regNo,
      phone,
      email,
      address,
      gstin,
      stateCode,
      letterheadConfig: {
        topMarginMm,
        bottomMarginMm,
        footerText,
        showQrCode,
        showDoctorCredentials,
      },
      documentSequences: {
        uhidPrefix,
        opdBillPrefix,
        ipdPrefix,
        pharmacyPrefix,
        invPrefix,
      },
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.serviceCode || !newService.name) return;

    clinicalStore.addServiceCatalogItem({
      id: `srv-${Date.now()}`,
      ...newService,
    });

    setNewService({
      serviceCode: "",
      name: "",
      category: "procedure",
      standardRate: 500,
      gstRate: 0,
    });
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Unified Settings Navigation Header */}
      <SettingsNav
        title="Hospital Branding & Print Settings"
        description="Configure hospital letterhead designer, document sequences, branch GSTIN, and ABDM health gateway"
        action={
          <Button
            onClick={handleSaveAll}
            className="bg-[#2563EB] hover:bg-blue-700 text-xs gap-1.5 font-bold cursor-pointer"
          >
            {saved ? <CheckCircle className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? "Settings Saved Successfully!" : "Save All Changes"}
          </Button>
        }
      />

      {/* Operational Settings Hub (Quick Navigation Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Link
          href="/settings/clinic"
          className="group p-3.5 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all text-left flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-md bg-blue-50 text-[#2563EB] flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                <Building2 className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#2563EB] transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors">
              Clinic Profile
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Timezone, default slot duration, WABA ID, and webhook secrets.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Operating Profile</span>
            <span className="font-semibold text-blue-600">Configure &rarr;</span>
          </div>
        </Link>

        <Link
          href="/settings/schedules"
          className="group p-3.5 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all text-left flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <CalendarDays className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              Doctor Schedules
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Weekly consultation shifts, slot durations & leave blocks.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Concurrency Locks</span>
            <span className="font-semibold text-emerald-600">Manage &rarr;</span>
          </div>
        </Link>

        <Link
          href="/settings/catalog"
          className="group p-3.5 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all text-left flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <BookOpen className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
              Master Catalog
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Prescription drug master with pg_trgm fuzzy search & tariffs.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Formulary & Prices</span>
            <span className="font-semibold text-purple-600">Browse &rarr;</span>
          </div>
        </Link>

        <Link
          href="/settings/team"
          className="group p-3.5 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all text-left flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Users className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
              Staff & Team RBAC
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Staff invitations, 4 clinical roles, and permission controls.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Access Control</span>
            <span className="font-semibold text-amber-600">Manage &rarr;</span>
          </div>
        </Link>

        <Link
          href="/settings/printouts"
          className="group p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 hover:border-blue-500 hover:shadow-xs transition-all text-left flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-md bg-blue-100 text-[#2563EB] flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                <Printer className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-blue-400 group-hover:text-[#2563EB] transition-colors" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors">
                Printout Templates
              </h3>
              <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0">New</Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              OPD, IPD, Billing & Thermal print formats, margins & live setup.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-blue-100 flex items-center justify-between text-[10px] text-blue-600">
            <span>Healthray Engine</span>
            <span className="font-semibold text-blue-700">Open Studio &rarr;</span>
          </div>
        </Link>
      </div>

      <Tabs defaultValue="letterhead" className="space-y-4">
        <TabsList>
          <TabsTrigger value="letterhead">Live Letterhead Designer</TabsTrigger>
          <TabsTrigger value="branch">Branch & GSTIN Config</TabsTrigger>
          <TabsTrigger value="sequences">Document Sequences</TabsTrigger>
          <TabsTrigger value="catalog">Service Catalog ({settings.serviceCatalog.length})</TabsTrigger>
          <TabsTrigger value="abdm">ABDM Gateway</TabsTrigger>
        </TabsList>

        {/* Tab 1: Live A4 Letterhead Designer with Canvas Preview */}
        <TabsContent value="letterhead" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-[#2563EB]" />
                    Letterhead Typography & Margins
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-medium text-slate-700 block mb-1">
                      Hospital Legal Brand Name
                    </label>
                    <Input value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-700 block mb-1">
                      Clinical Subtitle / Tagline
                    </label>
                    <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-700 block mb-1">
                        Top Margin ({topMarginMm}mm)
                      </label>
                      <Input
                        type="number"
                        value={topMarginMm}
                        onChange={(e) => setTopMarginMm(parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-700 block mb-1">
                        Bottom Margin ({bottomMarginMm}mm)
                      </label>
                      <Input
                        type="number"
                        value={bottomMarginMm}
                        onChange={(e) => setBottomMarginMm(parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-700 block mb-1">
                      Legal Statutory Footer Line
                    </label>
                    <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} />
                  </div>

                  <div className="pt-2 space-y-2 border-t border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showQrCode}
                        onChange={(e) => setShowQrCode(e.target.checked)}
                        className="rounded text-blue-600 h-4 w-4"
                      />
                      <span className="font-medium text-slate-800">Print ABDM Verification QR Code</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showDoctorCredentials}
                        onChange={(e) => setShowDoctorCredentials(e.target.checked)}
                        className="rounded text-blue-600 h-4 w-4"
                      />
                      <span className="font-medium text-slate-800">Print Doctor Registration & Qualifications</span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Live Real-Time Canvas Preview (7 cols) */}
            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold uppercase tracking-wider">Live Real-Time A4 Letterhead Preview</span>
                <Badge variant="outline" className="font-mono text-[10px]">Canvas Scale: 85%</Badge>
              </div>

              {/* Simulated Sheet */}
              <div
                style={{ paddingTop: `${topMarginMm * 0.75}px`, paddingBottom: `${bottomMarginMm * 0.75}px` }}
                className="w-full bg-white border border-slate-300 rounded-xl p-8 shadow-sm text-xs font-sans space-y-6 min-h-[520px]"
              >
                {/* Header Canvas */}
                <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                  <div>
                    <div className="text-lg font-black uppercase text-slate-900 tracking-tight">
                      {hospitalName}
                    </div>
                    <div className="text-xs text-slate-600 font-medium">{tagline}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {address} • Ph: {phone} • Email: {email}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                      Reg No: {regNo} | GSTIN: {gstin}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center font-black text-lg ml-auto mb-1">
                      +
                    </div>
                    <span className="text-[9px] uppercase font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      NABH Level 1
                    </span>
                  </div>
                </div>

                {/* Body Dummy Lines */}
                <div className="space-y-3 opacity-60">
                  <div className="h-3 w-48 bg-slate-200 rounded" />
                  <div className="h-2.5 w-full bg-slate-100 rounded" />
                  <div className="h-2.5 w-5/6 bg-slate-100 rounded" />
                  <div className="h-2.5 w-4/6 bg-slate-100 rounded" />

                  <div className="py-2">
                    <div className="h-20 w-full bg-slate-50 border border-slate-200 rounded p-2 text-[10px] text-slate-400 font-mono">
                      [Prescribed Medications & Dosages Area]
                    </div>
                  </div>
                </div>

                {/* Footer Canvas */}
                <div className="pt-6 border-t border-slate-200 flex items-end justify-between text-[10px] text-slate-500">
                  <div>
                    <div>{footerText}</div>
                    {showQrCode && (
                      <div className="flex items-center gap-1 text-[9px] text-blue-600 font-mono mt-1">
                        <QrCode className="h-3.5 w-3.5" /> ABDM Scannable Token
                      </div>
                    )}
                  </div>

                  {showDoctorCredentials && (
                    <div className="text-right">
                      <div className="font-bold text-slate-800">{sampleDoctor.name}</div>
                      <div className="text-[9px] text-slate-400">Reg No: {sampleDoctor.license || "MCI-VALIDATED"}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Branch & GSTIN Config */}
        <TabsContent value="branch" className="space-y-4 max-w-3xl">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Hospital Legal Profile & GSTIN</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">State Code</label>
                  <select
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="w-full h-9 rounded border border-slate-200 bg-white px-2 text-xs"
                  >
                    <option value="27">27 - Maharashtra</option>
                    <option value="07">07 - Delhi</option>
                    <option value="29">29 - Karnataka</option>
                    <option value="24">24 - Gujarat</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    15-Character Indian GSTIN *
                  </label>
                  <Input
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 27AAPCU9603R1ZV"
                    className="font-mono font-bold"
                  />
                  {isGstinValid ? (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                      <CheckCircle className="h-3 w-3" /> Valid Indian GSTIN (State: {gstinState || "Recognized"})
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> Invalid 15-character GSTIN format
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Official Clinical Phone</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Support Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Hospital Clinical Address</label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Document Sequences */}
        <TabsContent value="sequences" className="space-y-4 max-w-3xl">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">Document Series Prefixes</CardTitle>
              <CardDescription className="text-xs">
                Sequential generation prefixes for patient files, OPD encounters, IPD admissions, and invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">UHID Prefix</label>
                  <Input value={uhidPrefix} onChange={(e) => setUhidPrefix(e.target.value)} className="font-mono font-bold" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">OPD Prefix</label>
                  <Input value={opdBillPrefix} onChange={(e) => setOpdBillPrefix(e.target.value)} className="font-mono font-bold" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">IPD Prefix</label>
                  <Input value={ipdPrefix} onChange={(e) => setIpdPrefix(e.target.value)} className="font-mono font-bold" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Pharmacy Prefix</label>
                  <Input value={pharmacyPrefix} onChange={(e) => setPharmacyPrefix(e.target.value)} className="font-mono font-bold" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Invoice Prefix</label>
                  <Input value={invPrefix} onChange={(e) => setInvPrefix(e.target.value)} className="font-mono font-bold" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Service Catalog */}
        <TabsContent value="catalog" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Hospital Service & Procedure Master</CardTitle>
                <p className="text-xs text-slate-500">Configured tariffs and applicable GST tax slabs</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Service Bar */}
              <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Code</label>
                  <Input
                    value={newService.serviceCode}
                    onChange={(e) => setNewService({ ...newService, serviceCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. PROC-USG-ABD"
                    className="h-8 text-xs bg-white font-mono"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] text-slate-500 block mb-0.5">Service Name</label>
                  <Input
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    placeholder="e.g. Ultrasound Abdomen Pelvis"
                    className="h-8 text-xs bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Category</label>
                  <select
                    value={newService.category}
                    onChange={(e) => setNewService({ ...newService, category: e.target.value as any })}
                    className="w-full h-8 rounded border border-slate-200 bg-white px-2 text-xs"
                  >
                    <option value="procedure">Procedure</option>
                    <option value="consultation">Consultation</option>
                    <option value="lab_test">Lab Test</option>
                    <option value="radiology">Radiology</option>
                    <option value="bed">Bed Tariff</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Standard Rate (₹)</label>
                  <Input
                    type="number"
                    value={newService.standardRate || ""}
                    onChange={(e) => setNewService({ ...newService, standardRate: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs bg-white font-bold"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" size="sm" className="w-full h-8 text-xs bg-[#2563EB] hover:bg-blue-700">
                    <Plus className="h-3 w-3 mr-1" /> Add Service
                  </Button>
                </div>
              </form>

              {/* Catalog Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Code</TableHead>
                      <TableHead>Service Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Standard Tariff (₹)</TableHead>
                      <TableHead className="text-right">GST Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settings.serviceCatalog.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs font-bold text-[#2563EB]">{s.serviceCode}</TableCell>
                        <TableCell className="font-semibold text-slate-900 text-xs">{s.name}</TableCell>
                        <TableCell className="capitalize text-slate-500 text-xs">{s.category}</TableCell>
                        <TableCell className="text-right font-bold text-slate-900 text-xs">
                          {formatCurrencyINR(s.standardRate)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">{s.gstRate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: ABDM Gateway */}
        <TabsContent value="abdm" className="space-y-4 max-w-2xl">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900">ABDM National Health Stack Sandbox</CardTitle>
              <CardDescription className="text-xs">
                NHA Ayushman Bharat Digital Mission M1 & M2 integration parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Facility / HIP ID</label>
                  <Input defaultValue="IN01100001" className="font-mono font-bold" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Client ID</label>
                  <Input defaultValue="SBX_HMS_001" className="font-mono font-bold" />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between font-medium">
                <span>ABDM Milestone 1 & 2 Adapter Status: CONNECTED</span>
                <Badge variant="success">Verified</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
