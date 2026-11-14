"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, CheckCircle, FileText } from "lucide-react";
import { formatClinicalDate } from "@/utils/formatting";
import type { IpdAdmission } from "@/types/hms";
import { useClinicalStore } from "@/services/clinical-store";

interface DischargeSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admission: IpdAdmission | null;
  patientName?: string;
}

export function DischargeSummaryModal({
  open,
  onOpenChange,
  admission,
  patientName = "Aakash Mehta",
}: DischargeSummaryModalProps) {
  const store = useClinicalStore();

  const [diagnosisAtDischarge, setDiagnosisAtDischarge] = React.useState(
    "Coronary Artery Disease (CAD), Acute Coronary Syndrome (ACS) - Post PCI to LAD, Essential Hypertension"
  );
  const [courseInHospital, setCourseInHospital] = React.useState(
    "Patient presented with severe retrosternal chest pain and sweating. Underwent successful Primary Percutaneous Coronary Intervention (PCI) with drug-eluting stent to Proximal LAD. Hemodynamically stable, post-procedure echo shows LVEF 55%. Transferred from ICU to room and now ambulating comfortably."
  );
  const [conditionAtDischarge, setConditionAtDischarge] = React.useState(
    "Hemodynamically stable, afebrile, vitals normal. Surgical puncture site clean and dry."
  );
  const [dischargeMedications, setDischargeMedications] = React.useState(
    "1. Tab. Ticagrelor 90mg - 1-0-1 after food (1 year)\n2. Tab. Aspirin 75mg - 0-1-0 after lunch\n3. Tab. Atorvastatin 40mg - 0-0-1 at bedtime\n4. Tab. Metoprolol 25mg - 1-0-0 morning\n5. Tab. Pantoprazole 40mg - 1-0-0 before breakfast"
  );
  const [followUpAdvice, setFollowUpAdvice] = React.useState(
    "Review in Cardiology OPD after 7 days (or earlier in case of chest discomfort or bleeding). Low salt, cardiac diet."
  );

  const handlePrint = () => {
    window.print();
  };

  if (!admission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#2563EB]" />
            Official Inpatient Discharge Summary Generator
          </DialogTitle>
          <div className="flex items-center gap-2 pr-6">
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs gap-1.5 bg-[#2563EB] hover:bg-blue-700"
            >
              <Printer className="h-3.5 w-3.5" /> Print Summary (A4)
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Discharge Summary */}
        <div className="p-8 bg-white text-slate-900 font-sans text-xs space-y-5">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
            <div>
              <div className="text-lg font-black uppercase text-slate-900">
                {store.settings.hospitalName}
              </div>
              <div className="text-xs text-slate-600 font-medium">Department of Inpatient Services (IPD)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {store.settings.address} • Ph: {store.settings.phone}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Discharge Summary
              </span>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                Ref: {admission.admissionNumber}
              </div>
            </div>
          </div>

          {/* Admission Demographics */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div><span className="text-slate-500">Patient:</span> <span className="font-bold text-slate-900">{patientName}</span></div>
              <div><span className="text-slate-500">Admission No:</span> <span className="font-mono font-semibold">{admission.admissionNumber}</span></div>
              <div><span className="text-slate-500">Admit Date:</span> <span className="font-semibold">{formatClinicalDate(admission.admissionDate)}</span></div>
            </div>
            <div className="text-right">
              <div><span className="text-slate-500">Primary Consultant:</span> <span className="font-bold text-slate-900">Dr. Gaurav Kumar (DM Cardio)</span></div>
              <div><span className="text-slate-500">Discharge Date:</span> <span className="font-semibold">{formatClinicalDate(new Date().toISOString().slice(0, 10))}</span></div>
              <div><span className="text-slate-500">Length of Stay:</span> <span className="font-semibold">3 Days</span></div>
            </div>
          </div>

          {/* Final Diagnosis */}
          <div className="space-y-1">
            <div className="font-bold text-xs uppercase text-slate-900">Final Diagnosis at Discharge</div>
            <textarea
              value={diagnosisAtDischarge}
              onChange={(e) => setDiagnosisAtDischarge(e.target.value)}
              rows={2}
              className="w-full p-2.5 rounded border border-slate-200 text-xs font-semibold text-slate-900 bg-white"
            />
          </div>

          {/* Clinical Course in Hospital */}
          <div className="space-y-1">
            <div className="font-bold text-xs uppercase text-slate-900">Hospital Clinical Course & Interventions</div>
            <textarea
              value={courseInHospital}
              onChange={(e) => setCourseInHospital(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded border border-slate-200 text-xs text-slate-800 bg-white"
            />
          </div>

          {/* Condition at Discharge */}
          <div className="space-y-1">
            <div className="font-bold text-xs uppercase text-slate-900">Condition on Discharge</div>
            <textarea
              value={conditionAtDischarge}
              onChange={(e) => setConditionAtDischarge(e.target.value)}
              rows={1}
              className="w-full p-2 rounded border border-slate-200 text-xs text-slate-800 bg-white"
            />
          </div>

          {/* Discharge Medications */}
          <div className="space-y-1">
            <div className="font-bold text-xs uppercase text-slate-900">Discharge Medications (Rx)</div>
            <textarea
              value={dischargeMedications}
              onChange={(e) => setDischargeMedications(e.target.value)}
              rows={4}
              className="w-full p-2.5 rounded border border-slate-200 text-xs font-mono text-slate-800 bg-white"
            />
          </div>

          {/* Follow-up & Emergency Warning */}
          <div className="space-y-1">
            <div className="font-bold text-xs uppercase text-slate-900">Follow-up Instructions & Diet</div>
            <textarea
              value={followUpAdvice}
              onChange={(e) => setFollowUpAdvice(e.target.value)}
              rows={2}
              className="w-full p-2 rounded border border-slate-200 text-xs text-slate-800 bg-white"
            />
          </div>

          {/* Signatures */}
          <div className="pt-8 border-t border-slate-300 flex justify-between items-end">
            <div className="text-[10px] text-slate-500">
              ABDM Care Context Linked (FHIR R4 Composition). Valid clinical discharge summary.
            </div>
            <div className="text-center w-52">
              <div className="font-serif italic text-sm text-slate-800">Dr. Gaurav Kumar</div>
              <div className="border-t border-slate-400 mt-1 pt-1 font-bold text-[11px] text-slate-900">
                Attending Consultant Signature
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
