"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, Plus, Trash2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { GroundedPrescriptionItem } from "@/services/domain/prescription-service";

interface DraftPrescriptionCardProps {
  prescriptionId?: string;
  chiefComplaint: string;
  onChangeChiefComplaint: (val: string) => void;
  diagnosis: string;
  onChangeDiagnosis: (val: string) => void;
  followUpDays: number | null;
  onChangeFollowUpDays: (val: number | null) => void;
  items: GroundedPrescriptionItem[];
  onChangeItems: (items: GroundedPrescriptionItem[]) => void;
  readOnly?: boolean;
}

export function DraftPrescriptionCard({
  prescriptionId,
  chiefComplaint,
  onChangeChiefComplaint,
  diagnosis,
  onChangeDiagnosis,
  followUpDays,
  onChangeFollowUpDays,
  items,
  onChangeItems,
  readOnly = false,
}: DraftPrescriptionCardProps) {
  const handleItemChange = (index: number, field: keyof GroundedPrescriptionItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    // If doctor explicitly edited dosage/duration, re-evaluate needsReview
    if (field === "dosage" || field === "durationDays") {
      const hasMissingDosage = !updated[index].dosage || updated[index].dosage.trim() === "";
      const hasMissingDuration = !updated[index].durationDays || updated[index].durationDays <= 0;
      if (!hasMissingDosage && !hasMissingDuration && updated[index].matchScore >= 0.45) {
        updated[index].needsReview = false;
      }
    }
    onChangeItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    onChangeItems(updated);
  };

  const handleAddItem = () => {
    const newItem: GroundedPrescriptionItem = {
      spokenName: "New Medicine",
      brandName: "New Medicine",
      genericName: null,
      medicineMasterId: null,
      strength: null,
      dosage: "1 tab",
      frequency: "1-0-1",
      durationDays: 5,
      instructions: "After food",
      confidence: 1.0,
      matchScore: 1.0,
      needsReview: false,
    };
    onChangeItems([...items, newItem]);
  };

  return (
    <Card className="border border-slate-200 shadow-2xs bg-white mb-4">
      <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-[#2563EB]" />
          <CardTitle className="text-xs font-bold text-slate-800 tracking-wide uppercase">
            1. Clinical Assessment & Prescription Draft
          </CardTitle>
          {prescriptionId && (
            <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 bg-slate-100 text-slate-600 border-slate-200">
              Rx #{prescriptionId.slice(0, 8)}
            </Badge>
          )}
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="h-7 text-xs gap-1 border-slate-200 hover:border-[#2563EB] hover:text-[#2563EB] cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            Add Drug
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Row 1: Complaints, Diagnosis, Follow Up */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Chief Complaints
            </label>
            <Input
              value={chiefComplaint}
              onChange={(e) => onChangeChiefComplaint(e.target.value)}
              placeholder="e.g. Fever 3 days, throat pain, headache"
              className="h-8 text-xs bg-slate-50/50"
              disabled={readOnly}
            />
          </div>

          <div className="md:col-span-5 space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Provisional Diagnosis
            </label>
            <Input
              value={diagnosis}
              onChange={(e) => onChangeDiagnosis(e.target.value)}
              placeholder="e.g. Acute Viral Pharyngitis"
              className="h-8 text-xs font-semibold text-blue-900 bg-blue-50/30 border-blue-200 focus-visible:ring-blue-400"
              disabled={readOnly}
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Follow-Up (Days)
            </label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={90}
                value={followUpDays ?? ""}
                onChange={(e) => onChangeFollowUpDays(e.target.value ? parseInt(e.target.value, 10) : null)}
                placeholder="Days"
                className="h-8 text-xs pl-7"
                disabled={readOnly}
              />
              <Clock className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 2: Grounded Medicines Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Prescribed Medicines ({items.length})
            </span>
            <span className="text-[11px] text-slate-400">
              Grounded against clinic <strong className="font-mono text-slate-600">medicine_master</strong> catalog
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                  <th className="py-2 px-3 w-8">#</th>
                  <th className="py-2 px-3 min-w-[200px]">Drug & Generic Formulation</th>
                  <th className="py-2 px-2.5 w-24">Dosage</th>
                  <th className="py-2 px-2.5 w-28">Frequency</th>
                  <th className="py-2 px-2.5 w-24">Duration</th>
                  <th className="py-2 px-3 min-w-[160px]">Instructions</th>
                  <th className="py-2 px-2.5 w-24 text-center">Grounding</th>
                  {!readOnly && <th className="py-2 px-2 w-10 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                      No medicines prescribed yet. Use the microphone or click "+ Add Drug".
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr
                      key={idx}
                      className={item.needsReview ? "bg-amber-50/40 hover:bg-amber-50/60" : "hover:bg-slate-50/50"}
                    >
                      <td className="py-2 px-3 text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <Input
                          value={item.brandName || item.spokenName}
                          onChange={(e) => handleItemChange(idx, "brandName", e.target.value)}
                          className="h-7 text-xs font-bold text-slate-900 border-transparent hover:border-slate-300 focus:border-[#2563EB] bg-transparent p-1"
                          disabled={readOnly}
                        />
                        {item.genericName && (
                          <span className="text-[10px] text-slate-500 italic block px-1">
                            Salt: {item.genericName} {item.strength || ""}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5">
                        <Input
                          value={item.dosage}
                          onChange={(e) => handleItemChange(idx, "dosage", e.target.value)}
                          placeholder="e.g. 650mg"
                          className="h-7 text-xs border-slate-200 bg-white px-2"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="py-2 px-2.5">
                        <select
                          value={item.frequency}
                          onChange={(e) => handleItemChange(idx, "frequency", e.target.value)}
                          className="h-7 w-full rounded border border-slate-200 bg-white text-xs px-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                          disabled={readOnly}
                        >
                          <option value="1-0-1">1-0-1 (BD)</option>
                          <option value="1-0-0">1-0-0 (OD Morn)</option>
                          <option value="0-0-1">0-0-1 (OD Night)</option>
                          <option value="1-1-1">1-1-1 (TDS)</option>
                          <option value="OD">OD (Once daily)</option>
                          <option value="BD">BD (Twice daily)</option>
                          <option value="TDS">TDS (Thrice daily)</option>
                          <option value="QID">QID (Four times)</option>
                          <option value="SOS">SOS (As needed)</option>
                          <option value="HS">HS (At bedtime)</option>
                        </select>
                      </td>
                      <td className="py-2 px-2.5">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={1}
                            max={90}
                            value={item.durationDays}
                            onChange={(e) => handleItemChange(idx, "durationDays", parseInt(e.target.value, 10) || 1)}
                            className="h-7 text-xs border-slate-200 bg-white w-14 px-2"
                            disabled={readOnly}
                          />
                          <span className="text-[11px] text-slate-500">d</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          value={item.instructions || ""}
                          onChange={(e) => handleItemChange(idx, "instructions", e.target.value)}
                          placeholder="e.g. After food"
                          className="h-7 text-xs border-slate-200 bg-white px-2"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        {item.needsReview ? (
                          <Badge variant="outline" className="text-[9px] font-semibold bg-amber-100 text-amber-800 border-amber-300 gap-1 py-0 h-5">
                            <AlertCircle className="h-3 w-3" />
                            Review
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 py-0 h-5">
                            <CheckCircle2 className="h-3 w-3" />
                            Matched
                          </Badge>
                        )}
                      </td>
                      {!readOnly && (
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove drug"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
