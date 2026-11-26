"use client";

import * as React from "react";
import { SettingsNav } from "@/components/shell/SettingsNav";
import { PrintoutEngine } from "@/components/print/PrintoutEngine";
import { PrintOrderModal, type PrintOrderItem } from "@/components/print/PrintOrderModal";
import { DeclarationModal } from "@/components/print/DeclarationModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Printer,
  Save,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Sliders,
  CheckCircle2,
  ListOrdered,
  Sparkles,
} from "lucide-react";
import {
  DEFAULT_PRINT_CONFIGS,
  type DefaultPrintConfig,
  type PrintTemplateType,
} from "@/lib/print-defaults";
import { cn } from "@/lib/utils";

const TEMPLATE_TABS: Array<{ id: PrintTemplateType; label: string; badge?: string }> = [
  { id: "opd_treatment", label: "OPD Treatment", badge: "Rx" },
  { id: "opd_case_paper", label: "OPD Case Paper" },
  { id: "opd_consent_form", label: "OPD Consent Form" },
  { id: "ipd_document", label: "IPD Document", badge: "Discharge" },
  { id: "ipd_treatment", label: "IPD Treatment" },
  { id: "ipd_initial_assessment", label: "IPD Assessment" },
  { id: "lab_order", label: "Lab / Order" },
  { id: "opd_billing", label: "OPD Billing", badge: "A4" },
  { id: "thermal_print", label: "Thermal Print", badge: "80mm" },
];

const MARGIN_OPTIONS = ["0", "0.1", "0.25", "0.5", "0.75", "1.0", "1.25", "1.5", "2.0"];
const FONT_FAMILIES = ["Inter", "Calibri", "Arial", "Times New Roman", "Courier New"];
const FONT_SIZES = [8, 9, 10, 11, 12, 13, 14, 15];
const HEADER_HEIGHT_OPTIONS = [
  { value: "0.75", label: "0.75 in (~28px Compact)" },
  { value: "1.0", label: "1.0 in (~38px Standard)" },
  { value: "1.25", label: "1.25 in (~48px Default)" },
  { value: "1.5", label: "1.5 in (~57px Prominent)" },
  { value: "2.0", label: "2.0 in (~76px Large)" },
  { value: "2.5", label: "2.5 in (~95px Banner)" },
];

export default function PrintoutsSettingsPage() {
  const [selectedTemplate, setSelectedTemplate] = React.useState<PrintTemplateType>("opd_treatment");
  const [configs, setConfigs] = React.useState<Record<PrintTemplateType, DefaultPrintConfig>>(
    () => JSON.parse(JSON.stringify(DEFAULT_PRINT_CONFIGS))
  );

  const [zoom, setZoom] = React.useState<number>(1);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = React.useState<boolean>(false);
  const [orderModalOpen, setOrderModalOpen] = React.useState<boolean>(false);
  const [declarationModalOpen, setDeclarationModalOpen] = React.useState<boolean>(false);

  // Active configuration for selected template
  const currentConfig = configs[selectedTemplate] || DEFAULT_PRINT_CONFIGS[selectedTemplate];

  // Load from API on mount
  React.useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/crm/print-settings");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setConfigs((prev) => ({
              ...prev,
              ...json.data,
            }));
          }
        }
      } catch {
        // Fallback to default in offline / mock
      }
    }
    loadSettings();
  }, []);

  const updateCurrentConfig = (updates: Partial<DefaultPrintConfig>) => {
    setConfigs((prev) => ({
      ...prev,
      [selectedTemplate]: {
        ...prev[selectedTemplate],
        ...updates,
      },
    }));
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/crm/print-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentConfig,
          templateType: selectedTemplate,
        }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch {
      // Offline fallback
      setSavedSuccess(true);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset this template to default?")) return;
    try {
      await fetch(`/api/crm/print-settings?templateType=${selectedTemplate}`, {
        method: "DELETE",
      });
    } catch {
      // Ignored
    }
    setConfigs((prev) => ({
      ...prev,
      [selectedTemplate]: JSON.parse(JSON.stringify(DEFAULT_PRINT_CONFIGS[selectedTemplate])),
    }));
  };

  const handlePrintTest = () => {
    window.print();
  };

  // Convert current printOrder into PrintOrderItems
  const orderItems: PrintOrderItem[] = (currentConfig.printOrder || []).map((id) => ({
    id,
    label: id
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim(),
    visible: currentConfig.visibleFields?.[id] ?? true,
  }));

  const handleSaveOrder = (newItems: PrintOrderItem[]) => {
    const updatedOrder = newItems.map((item) => item.id);
    const updatedVisibleFields = { ...(currentConfig.visibleFields || {}) };
    newItems.forEach((item) => {
      updatedVisibleFields[item.id] = item.visible;
    });

    updateCurrentConfig({
      printOrder: updatedOrder,
      visibleFields: updatedVisibleFields,
    });
  };

  const getPageSizeLabel = () => {
    if (selectedTemplate === "thermal_print" || currentConfig.pageSize === "3in") {
      return "80mm Thermal Roll";
    }
    if (currentConfig.pageSize === "A5") {
      return "A5 (148 × 210 mm)";
    }
    return "A4 (210 × 297 mm)";
  };

  return (
    <div className="space-y-4">
      {/* Settings Navigation Bar (Hidden in Print) */}
      <div className="print:hidden">
        <SettingsNav
          title="Printout Templates"
          description="Configure Healthray-compatible print layouts, margins, headers, footers & live POS previews"
          action={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrintTest}
                className="h-8 text-xs gap-1.5 cursor-pointer font-medium"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                Print Test Page
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="h-8 text-xs gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-medium cursor-pointer shadow-xs"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    {saving ? "Saving..." : "Save Configuration"}
                  </>
                )}
              </Button>
            </div>
          }
        />
      </div>

      {/* Main Template Tabs Bar (Hidden in Print) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-none print:hidden">
        {TEMPLATE_TABS.map((tab) => {
          const isActive = selectedTemplate === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTemplate(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-t-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border-b-2 cursor-pointer",
                isActive
                  ? "border-[#2563EB] text-[#2563EB] bg-blue-50/60 font-bold"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={cn(
                    "text-[10px] px-1 py-0.2 rounded font-mono",
                    isActive ? "bg-blue-200 text-blue-900" : "bg-slate-200 text-slate-700"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2-Column Workstation Layout: Left Config Form + Right Live Paper Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start print:block">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: HIGH-DENSITY HEALTHRAY PAGE SETUP FORM (5 COLS - HIDDEN IN PRINT) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4 print:hidden">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-slate-900">Page Setup & Typography</h3>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Default</span>
              </button>
            </div>

            {/* Document Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">Document Title</label>
              <Input
                value={currentConfig.title}
                onChange={(e) => updateCurrentConfig({ title: e.target.value })}
                className="h-8 text-xs"
                placeholder="e.g. OPD Treatment, Case Paper..."
              />
            </div>

            {/* Paper Size & Layout */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Paper Size</label>
                <select
                  value={currentConfig.pageSize}
                  onChange={(e) =>
                    updateCurrentConfig({ pageSize: e.target.value as "A4" | "A5" | "3in" })
                  }
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="A4">A4 (Standard Sheet)</option>
                  <option value="A5">A5 (Prescription Pad)</option>
                  <option value="3in">3-Inch (80mm Thermal)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Column Type</label>
                <div className="flex items-center gap-3 pt-1 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="columnType"
                      checked={currentConfig.columnType === "single"}
                      onChange={() => updateCurrentConfig({ columnType: "single" })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Single</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="columnType"
                      checked={currentConfig.columnType === "double"}
                      onChange={() => updateCurrentConfig({ columnType: "double" })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Double</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Column Width Split Slider (Visible when columnType === 'double') */}
            {currentConfig.columnType === "double" && currentConfig.pageSize !== "3in" && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-700">
                    Column Width Split (Left Column %)
                  </label>
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    {currentConfig.columnWidth || 50}% / {100 - (currentConfig.columnWidth || 50)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={currentConfig.columnWidth || 50}
                  onChange={(e) => updateCurrentConfig({ columnWidth: parseInt(e.target.value, 10) })}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>10% Left (Narrow)</span>
                  <span>50% Equal Split</span>
                  <span>90% Left (Wide)</span>
                </div>
              </div>
            )}

            {/* Margins Matrix (Top, Bottom, Left, Right in Inches) */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-700 block">Page Margins (Inches)</label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">Top</span>
                  <select
                    value={currentConfig.marginTop}
                    onChange={(e) => updateCurrentConfig({ marginTop: e.target.value })}
                    className="w-full h-7 px-1.5 text-xs border border-slate-200 rounded bg-white"
                  >
                    {MARGIN_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m} in</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Bottom</span>
                  <select
                    value={currentConfig.marginBottom}
                    onChange={(e) => updateCurrentConfig({ marginBottom: e.target.value })}
                    className="w-full h-7 px-1.5 text-xs border border-slate-200 rounded bg-white"
                  >
                    {MARGIN_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m} in</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Left</span>
                  <select
                    value={currentConfig.marginLeft}
                    onChange={(e) => updateCurrentConfig({ marginLeft: e.target.value })}
                    className="w-full h-7 px-1.5 text-xs border border-slate-200 rounded bg-white"
                  >
                    {MARGIN_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m} in</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Right</span>
                  <select
                    value={currentConfig.marginRight}
                    onChange={(e) => updateCurrentConfig({ marginRight: e.target.value })}
                    className="w-full h-7 px-1.5 text-xs border border-slate-200 rounded bg-white"
                  >
                    {MARGIN_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m} in</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Typography: Font Size, Line Spacing, Family */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Font Size</label>
                <select
                  value={currentConfig.fontSize}
                  onChange={(e) => updateCurrentConfig({ fontSize: parseInt(e.target.value, 10) })}
                  className="w-full h-8 px-2 text-xs border border-slate-200 rounded bg-white"
                >
                  {FONT_SIZES.map((s) => (
                    <option key={s} value={s}>{s} pt</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Line Spacing</label>
                <div className="flex items-center">
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={currentConfig.lineSpacing}
                    onChange={(e) =>
                      updateCurrentConfig({ lineSpacing: parseInt(e.target.value, 10) || 0 })
                    }
                    className="h-8 text-xs"
                  />
                  <span className="text-xs text-slate-500 ml-1">pt</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Font Family</label>
                <select
                  value={currentConfig.fontFamily}
                  onChange={(e) => updateCurrentConfig({ fontFamily: e.target.value })}
                  className="w-full h-8 px-1.5 text-xs border border-slate-200 rounded bg-white"
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Header & Clinic Branding Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1.5">
              Header & Clinic Branding
            </h3>

            <div className="space-y-1 pb-1">
              <label className="text-xs font-semibold text-slate-700 block">Header Image Height</label>
              <select
                value={currentConfig.headerHeight || "1.25"}
                onChange={(e) => updateCurrentConfig({ headerHeight: e.target.value })}
                className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {HEADER_HEIGHT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={currentConfig.displayHeader}
                  onChange={(e) => updateCurrentConfig({ displayHeader: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <span>Display Header</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={currentConfig.includeLogo}
                  onChange={(e) => updateCurrentConfig({ includeLogo: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <span>Include Clinic Logo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={currentConfig.displayDoctorDetails}
                  onChange={(e) =>
                    updateCurrentConfig({ displayDoctorDetails: e.target.checked })
                  }
                  className="rounded text-blue-600"
                />
                <span>Display Doctor Details</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={currentConfig.displayBarcode}
                  onChange={(e) => updateCurrentConfig({ displayBarcode: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <span>Display Barcode</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={currentConfig.displayDateTime}
                  onChange={(e) => updateCurrentConfig({ displayDateTime: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <span>Date & Time Stamp</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={currentConfig.displayVitals}
                  onChange={(e) => updateCurrentConfig({ displayVitals: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <span>Display Vitals Ribbon</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 col-span-2">
                <input
                  type="checkbox"
                  checked={currentConfig.displayPatientDetailsInColumns}
                  onChange={(e) =>
                    updateCurrentConfig({ displayPatientDetailsInColumns: e.target.checked })
                  }
                  className="rounded text-blue-600"
                />
                <span>Display Patient Details in 4-Column Grid</span>
              </label>
            </div>
          </div>

          {/* Footer & Signatures Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1.5">
              Footer & Signatures
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={currentConfig.displayFooter}
                  onChange={(e) => updateCurrentConfig({ displayFooter: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <span>Display Footer</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={currentConfig.displaySignature}
                  onChange={(e) => updateCurrentConfig({ displaySignature: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <span>Doctor Signature</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 col-span-2">
                <input
                  type="checkbox"
                  checked={currentConfig.patientKinSignature}
                  onChange={(e) =>
                    updateCurrentConfig({ patientKinSignature: e.target.checked })
                  }
                  className="rounded text-blue-600"
                />
                <span>Patient / Kin Signature Block</span>
              </label>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-xs font-semibold text-slate-700 block">Custom Footer Disclaimer</label>
              <Input
                value={currentConfig.footerText}
                onChange={(e) => updateCurrentConfig({ footerText: e.target.value })}
                className="h-8 text-xs font-mono"
                placeholder="Kindly correlate clinically..."
              />
            </div>
          </div>

          {/* Quick Actions (Set Print Order & Add Declaration) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOrderModalOpen(true)}
              className="flex-1 py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100/80 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ListOrdered className="h-3.5 w-3.5" />
              Set Print Order
            </button>
            <button
              type="button"
              onClick={() => setDeclarationModalOpen(true)}
              className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              Add Declaration
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: REALISTIC LIVE DOCUMENT PREVIEW CANVAS                      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-slate-200/80 border border-slate-300 rounded-lg overflow-hidden shadow-inner flex flex-col print:border-none print:shadow-none print:bg-transparent print:p-0 print:m-0 print:block">
          {/* Preview Navigation & Zoom Bar (Hidden in Print) */}
          <div className="bg-slate-800 text-slate-200 px-4 py-2 flex items-center justify-between text-xs border-b border-slate-700 print:hidden">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">Live Printout Preview:</span>
              <span className="text-blue-400 font-bold">{currentConfig.title}</span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono ml-1">
                Page 1 of 1 • {getPageSizeLabel()}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-700/80 rounded px-1.5 py-0.5">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, parseFloat((z - 0.1).toFixed(1))))}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-[11px] w-12 text-center text-slate-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.5, parseFloat((z + 0.1).toFixed(1))))}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handlePrintTest}
                className="h-7 text-xs bg-[#2563EB] hover:bg-blue-600 text-white gap-1 px-2.5 cursor-pointer font-medium"
              >
                <Printer className="h-3 w-3" />
                Print Preview
              </Button>
            </div>
          </div>

          {/* Realistic Paper Container with Inner Scroll */}
          <div className="p-6 overflow-auto max-h-[82vh] flex justify-center bg-slate-200/50 print:p-0 print:bg-transparent print:max-h-none print:overflow-visible print:block">
            <PrintoutEngine
              templateType={selectedTemplate}
              config={currentConfig}
              zoom={zoom}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <PrintOrderModal
        open={orderModalOpen}
        onOpenChange={setOrderModalOpen}
        title={`Set Print Order - ${currentConfig.title}`}
        items={orderItems}
        onSave={handleSaveOrder}
      />

      <DeclarationModal
        open={declarationModalOpen}
        onOpenChange={setDeclarationModalOpen}
        declaration={currentConfig.footerText || ""}
        onSave={(text) => updateCurrentConfig({ footerText: text })}
      />
    </div>
  );
}
