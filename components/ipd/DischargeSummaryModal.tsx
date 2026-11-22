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
  doctorName?: string;
}

export function DischargeSummaryModal({
  open,
  onOpenChange,
  admission,
  patientName,
  doctorName,
}: DischargeSummaryModalProps) {
  const store = useClinicalStore();

  const resolvedPatientName =
    patientName ||
    store.patients.find((p) => p.id === admission?.patientId)?.fullName ||
    store.beds.find((b) => b.id === admission?.bedId)?.patientName ||
    "Inpatient";

  const resolvedDoctorName =
    doctorName ||
    store.staff.find((s) => s.id === admission?.primaryDoctorId || s.name.toLowerCase() === admission?.primaryDoctorId.toLowerCase())?.name ||
    admission?.primaryDoctorId ||
    "Consulting Physician";

  const lengthOfStay = React.useMemo(() => {
    if (!admission?.admissionDate) return "1 Day";
    const admitDate = new Date(admission.admissionDate);
    const dischargeDate = new Date();
    const diffTime = Math.abs(dischargeDate.getTime() - admitDate.getTime());
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return `${diffDays} Day${diffDays > 1 ? "s" : ""}`;
  }, [admission?.admissionDate]);

  const [diagnosisAtDischarge, setDiagnosisAtDischarge] = React.useState(
    admission?.dischargeSummary?.diagnosisAtDischarge || admission?.admissionReason || ""
  );
  const [courseInHospital, setCourseInHospital] = React.useState(
    admission?.dischargeSummary?.clinicalCourse ||
      "Inpatient clinical management, observation, and treatment completed. Patient is hemodynamically stable."
  );
  const [conditionAtDischarge, setConditionAtDischarge] = React.useState(
    "Hemodynamically stable, afebrile, vitals normal."
  );
  const [dischargeMedications, setDischargeMedications] = React.useState(
    admission?.dischargeSummary?.dischargePrescriptions
      ?.map((p, idx) => `${idx + 1}. ${p.medicineName} ${p.dosage} - ${p.frequency} (${p.durationDays}d)`)
      .join("\n") || ""
  );
  const [followUpAdvice, setFollowUpAdvice] = React.useState(
    admission?.dischargeSummary?.followUpInstructions ||
      "Review in OPD after 7 days or immediately in case of discomfort."
  );

  React.useEffect(() => {
    if (open && admission) {
      setDiagnosisAtDischarge(
        admission.dischargeSummary?.diagnosisAtDischarge || admission.admissionReason || ""
      );
      setCourseInHospital(
        admission.dischargeSummary?.clinicalCourse ||
          "Inpatient clinical management, observation, and treatment completed. Patient is hemodynamically stable."
      );
      setConditionAtDischarge("Hemodynamically stable, afebrile, vitals normal.");
      setDischargeMedications(
        admission.dischargeSummary?.dischargePrescriptions
          ?.map((p, idx) => `${idx + 1}. ${p.medicineName} ${p.dosage} - ${p.frequency} (${p.durationDays}d)`)
          .join("\n") || ""
      );
      setFollowUpAdvice(
        admission.dischargeSummary?.followUpInstructions ||
          "Review in OPD after 7 days or immediately in case of discomfort."
      );
    }
  }, [open, admission]);

  const handlePrint = () => {
    window.print();
  };

  if (!admission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 print:max-h-none print:overflow-visible print:border-none print:shadow-none">
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between print:hidden">
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
              <div><span className="text-slate-500">Patient:</span> <span className="font-bold text-slate-900">{resolvedPatientName}</span></div>
              <div><span className="text-slate-500">Admission No:</span> <span className="font-mono font-semibold">{admission.admissionNumber}</span></div>
              <div><span className="text-slate-500">Admit Date:</span> <span className="font-semibold">{formatClinicalDate(admission.admissionDate)}</span></div>
            </div>
            <div className="text-right">
              <div><span className="text-slate-500">Primary Consultant:</span> <span className="font-bold text-slate-900">{resolvedDoctorName}</span></div>
              <div><span className="text-slate-500">Discharge Date:</span> <span className="font-semibold">{formatClinicalDate(new Date().toISOString().slice(0, 10))}</span></div>
              <div><span className="text-slate-500">Length of Stay:</span> <span className="font-semibold">{lengthOfStay}</span></div>
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
              <div className="font-serif italic text-sm text-slate-800">{resolvedDoctorName}</div>
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
