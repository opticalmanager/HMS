"use client";

import * as React from "react";
import { Plus, Trash2, Pill, Sparkles, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { handleEnterNavigation } from "@/utils/form-navigation";
import { parseDoseFrequency } from "@/utils/dose-parser";
import type { PrescriptionItem } from "@/types/hms";

interface PrescriptionEditorProps {
  prescriptions: PrescriptionItem[];
  onChange: (items: PrescriptionItem[]) => void;
}

const RX_CLONE_TEMPLATES = [
  {
    name: "Essential HTN Regimen",
    items: [
      { medicineName: "Telmisartan 40mg", dosage: "40 mg", frequency: "1-0-0", timing: "after_food" as const, durationDays: 30, quantity: 30, instructions: "Take once daily in the morning" },
      { medicineName: "Amlodipine 5mg", dosage: "5 mg", frequency: "0-0-1", timing: "after_food" as const, durationDays: 30, quantity: 30, instructions: "Take at bedtime" },
    ],
  },
  {
    name: "Type 2 Diabetes Regimen",
    items: [
      { medicineName: "Metformin 500mg SR", dosage: "500 mg", frequency: "1-0-1", timing: "after_food" as const, durationDays: 30, quantity: 60, instructions: "Take with breakfast and dinner" },
      { medicineName: "Glimepiride 1mg", dosage: "1 mg", frequency: "1-0-0", timing: "before_food" as const, durationDays: 30, quantity: 30, instructions: "Take 15 mins before breakfast" },
    ],
  },
  {
    name: "Acute URTI / Viral Regimen",
    items: [
      { medicineName: "Paracetamol 500mg", dosage: "500 mg", frequency: "1-1-1", timing: "after_food" as const, durationDays: 3, quantity: 9, instructions: "Take for fever or body ache" },
      { medicineName: "Amoxicillin 500mg", dosage: "500 mg", frequency: "1-0-1", timing: "after_food" as const, durationDays: 5, quantity: 10, instructions: "Complete full 5-day antibiotic course" },
      { medicineName: "Cetirizine 10mg", dosage: "10 mg", frequency: "0-0-1", timing: "after_food" as const, durationDays: 5, quantity: 5, instructions: "Take once at bedtime" },
    ],
  },
  {
    name: "GERD / Gastritis Regimen",
    items: [
      { medicineName: "Pantoprazole 40mg", dosage: "40 mg", frequency: "1-0-0", timing: "before_food" as const, durationDays: 14, quantity: 14, instructions: "Take 30 mins before morning breakfast" },
      { medicineName: "Sucralfate Syrup", dosage: "10 ml", frequency: "1-0-1", timing: "before_food" as const, durationDays: 7, quantity: 1, instructions: "Take before lunch and dinner" },
    ],
  },
];

export function PrescriptionEditor({
  prescriptions,
  onChange,
}: PrescriptionEditorProps) {
  const [shorthand, setShorthand] = React.useState("");
  const [newMed, setNewMed] = React.useState<PrescriptionItem>({
    medicineName: "",
    dosage: "500 mg",
    frequency: "1-0-1",
    timing: "after_food",
    durationDays: 5,
    instructions: "Take with water",
    quantity: 10,
  });

  // Automatically parse shorthand (e.g. "1-0-1 5d") as user types or tabs out
  const handleShorthandChange = (val: string) => {
    setShorthand(val);
    if (val.trim().length >= 3) {
      const parsed = parseDoseFrequency(val, newMed.durationDays || 5);
      setNewMed((prev) => ({
        ...prev,
        frequency: parsed.frequency,
        durationDays: parsed.durationDays,
        quantity: parsed.totalQuantity,
        instructions: parsed.timingDescription,
      }));
    }
  };

  const handleAdd = () => {
    if (!newMed.medicineName.trim()) return;

    onChange([...prescriptions, { ...newMed, id: `rx-${Date.now()}` }]);
    setNewMed({
      medicineName: "",
      dosage: "500 mg",
      frequency: "1-0-1",
      timing: "after_food",
      durationDays: 5,
      instructions: "Take with water",
      quantity: 10,
    });
    setShorthand("");
  };

  const handleRemove = (index: number) => {
    onChange(prescriptions.filter((_, i) => i !== index));
  };

  const handleCloneTemplate = (templateItems: typeof RX_CLONE_TEMPLATES[0]["items"]) => {
    const formatted = templateItems.map((item, idx) => ({
      ...item,
      id: `rx-clone-${Date.now()}-${idx}`,
    }));
    onChange([...prescriptions, ...formatted]);
  };

  return (
    <div className="space-y-4">
      {/* 1-Click Previous Rx Cloner Bar */}
      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Copy className="h-3.5 w-3.5 text-[#2563EB]" />
          <span>1-Click Clinical Rx Cloner:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {RX_CLONE_TEMPLATES.map((tmpl) => (
            <Button
              key={tmpl.name}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleCloneTemplate(tmpl.items)}
              className="h-7 text-[11px] gap-1 bg-white hover:bg-blue-50 hover:text-[#2563EB] hover:border-blue-300"
            >
              <Sparkles className="h-3 w-3 text-amber-500" />
              {tmpl.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Quick Add Form Row with Dose Frequency Parser */}
      <div
        className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50"
        onKeyDown={(e) => handleEnterNavigation(e)}
        data-form-container="true"
      >
        <div className="md:col-span-2">
          <label className="text-[11px] font-medium text-slate-600 block mb-1">Medicine Name *</label>
          <Input
            value={newMed.medicineName}
            onChange={(e) => setNewMed({ ...newMed, medicineName: e.target.value })}
            placeholder="e.g. Telmisartan 40mg / Amoxicillin"
            className="text-xs h-8 bg-white"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-600 block mb-1">Dosage</label>
          <Input
            value={newMed.dosage}
            onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
            placeholder="40 mg / 500 mg"
            className="text-xs h-8 bg-white"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-600 block mb-1">
            Dose Parser <span className="text-[#2563EB] font-mono">(1-0-1 5d)</span>
          </label>
          <Input
            value={shorthand}
            onChange={(e) => handleShorthandChange(e.target.value)}
            placeholder="1-0-1 5d / TDS 3d"
            className="text-xs h-8 bg-white font-mono"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-slate-600 block mb-1">Timing</label>
          <select
            value={newMed.timing}
            onChange={(e) => setNewMed({ ...newMed, timing: e.target.value as any })}
            className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800"
          >
            <option value="after_food">After Food</option>
            <option value="before_food">Before Food (Empty Stomach)</option>
            <option value="with_food">With Food</option>
            <option value="as_needed">As Needed (SOS)</option>
          </select>
        </div>

        <div className="flex items-end">
          <Button
            type="button"
            onClick={handleAdd}
            size="sm"
            className="w-full h-8 text-xs bg-[#2563EB] hover:bg-blue-700 font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Rx
          </Button>
        </div>
      </div>

      {/* Prescription Line Items Table */}
      {prescriptions.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
          No medications prescribed yet. Type above with shorthand (e.g. &ldquo;1-0-1 5d&rdquo;) or click a template.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Timing</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Total Quantity</TableHead>
                <TableHead className="w-12 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((item, idx) => (
                <TableRow key={item.id || idx}>
                  <TableCell className="font-semibold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Pill className="h-3.5 w-3.5 text-blue-500" />
                    {item.medicineName}
                  </TableCell>
                  <TableCell className="text-xs">{item.dosage}</TableCell>
                  <TableCell>
                    <span className="font-mono font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs">
                      {item.frequency}
                    </span>
                  </TableCell>
                  <TableCell className="capitalize text-slate-600 text-xs">
                    {item.timing.replace("_", " ")}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-800">{item.durationDays} Days</TableCell>
                  <TableCell className="font-bold text-slate-900 text-xs">{item.quantity} Units</TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
