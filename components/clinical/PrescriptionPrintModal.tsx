"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Share2, Download, Building2, Stethoscope } from "lucide-react";
import { formatClinicalDate } from "@/utils/formatting";
import type { Appointment, DiagnosisEntry, PrescriptionItem, VitalRecord } from "@/types/hms";
import type { HospitalSettings } from "@/services/clinical-store";

interface PrescriptionPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Appointment;
  vitals?: VitalRecord;
  diagnoses: DiagnosisEntry[];
  prescriptions: PrescriptionItem[];
  clinicalNotes: string;
  settings: HospitalSettings;
  onWhatsAppShare?: () => void;
}

export function PrescriptionPrintModal({
  open,
  onOpenChange,
  patient,
  vitals,
  diagnoses,
  prescriptions,
  clinicalNotes,
  settings,
  onWhatsAppShare,
}: PrescriptionPrintModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between print:hidden">
          <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Printer className="h-4 w-4 text-[#2563EB]" />
            A4 Digital Clinical Letterhead Print Preview
          </DialogTitle>
          <div className="flex items-center gap-2 pr-6">
            {onWhatsAppShare && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onWhatsAppShare}
                className="h-8 text-xs gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                <Share2 className="h-3.5 w-3.5" /> WhatsApp Rx
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs gap-1.5 bg-[#2563EB] hover:bg-blue-700"
            >
              <Printer className="h-3.5 w-3.5" /> Print Letterhead (A4)
            </Button>
          </div>
        </DialogHeader>

        {/* The Printable A4 Sheet Body */}
        <div
          id="clinical-letterhead-print-area"
          className="p-8 bg-white text-slate-900 min-h-[680px] font-sans text-xs space-y-6 print:p-0 print:m-0"
        >
          {/* Hospital Header Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <div className="text-xl font-black uppercase tracking-tight text-slate-900">
                {settings.hospitalName}
              </div>
              <div className="text-xs text-slate-600 font-medium mt-0.5">{settings.tagline}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {settings.address} • Ph: {settings.phone} • Email: {settings.email}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Reg No: {settings.registrationNumber} | GSTIN: {settings.gstin}
              </div>
            </div>

            <div className="text-right">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center font-black text-xl ml-auto mb-1">
                +
              </div>
              <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                NABH Accredited
              </span>
            </div>
          </div>

          {/* Attending Doctor & Patient Demographics Banner */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Demographics</div>
              <div className="text-sm font-bold text-slate-900">{patient.patientName}</div>
              <div className="text-xs text-slate-600 font-mono">
                UHID: <span className="font-bold">{patient.patientUhid || "UHID-2026-0041"}</span> | Token: #{patient.tokenNumber}
              </div>
              <div className="text-xs text-slate-600">
                Phone: {patient.patientPhone} | Date: {formatClinicalDate(patient.appointmentDate)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attending Clinician</div>
              <div className="text-sm font-bold text-slate-900">{patient.doctorName}</div>
              <div className="text-xs text-slate-600 font-medium">{patient.department}</div>
              <div className="text-[10px] text-slate-500 font-mono">Reg No: MCI-2015-48291</div>
            </div>
          </div>

          {/* Vitals Summary Ribbon */}
          {vitals && (
            <div className="py-2 px-3 rounded-md bg-slate-50/80 border border-slate-200 flex flex-wrap items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">BP:</span>{" "}
                <span className="font-bold font-mono">
                  {vitals.systolicBp && vitals.diastolicBp ? `${vitals.systolicBp}/${vitals.diastolicBp} mmHg` : "120/80"}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Pulse:</span>{" "}
                <span className="font-bold font-mono">{vitals.pulseRate || 76} bpm</span>
              </div>
              <div>
                <span className="text-slate-400">SpO2:</span>{" "}
                <span className="font-bold font-mono">{vitals.spo2 || 98}%</span>
              </div>
              <div>
                <span className="text-slate-400">Temp:</span>{" "}
                <span className="font-bold font-mono">{vitals.temperature || 98.6}°F</span>
              </div>
              <div>
                <span className="text-slate-400">BMI:</span>{" "}
                <span className="font-bold font-mono">{vitals.bmi || 24.2} kg/m²</span>
              </div>
            </div>
          )}

          {/* Clinical Diagnoses (ICD-10) */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Clinical Diagnosis (ICD-10)
            </div>
            <div className="flex flex-wrap gap-2">
              {diagnoses.length === 0 ? (
                <span className="text-slate-400 italic">No formal diagnosis coded.</span>
              ) : (
                diagnoses.map((d) => (
                  <div
                    key={d.icdCode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-300 font-medium"
                  >
                    <span className="font-mono font-bold text-[#2563EB]">[{d.icdCode}]</span>
                    <span>{d.description}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Prescription (Rx) Table */}
          <div className="space-y-2">
            <div className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span className="text-lg font-serif">℞</span> Prescribed Medications
            </div>
            <table className="w-full text-left border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-700">
                  <th className="p-2 border-r border-slate-300">#</th>
                  <th className="p-2 border-r border-slate-300">Drug Brand / Generic Name</th>
                  <th className="p-2 border-r border-slate-300">Dosage</th>
                  <th className="p-2 border-r border-slate-300">Frequency</th>
                  <th className="p-2 border-r border-slate-300">Timing</th>
                  <th className="p-2 border-r border-slate-300">Duration</th>
                  <th className="p-2">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {prescriptions.map((p, idx) => (
                  <tr key={p.id || idx}>
                    <td className="p-2 border-r border-slate-200 font-mono text-center">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{p.medicineName}</td>
                    <td className="p-2 border-r border-slate-200">{p.dosage}</td>
                    <td className="p-2 border-r border-slate-200 font-mono font-semibold text-blue-700">{p.frequency}</td>
                    <td className="p-2 border-r border-slate-200 capitalize">{p.timing.replace("_", " ")}</td>
                    <td className="p-2 border-r border-slate-200">{p.durationDays} Days</td>
                    <td className="p-2 font-bold">{p.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Clinical Findings & Doctor Advice */}
          {clinicalNotes && (
            <div className="space-y-1 border-t border-slate-200 pt-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Examination Findings & Clinical Advice
              </div>
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {clinicalNotes}
              </p>
            </div>
          )}

          {/* Doctor Signature Block & Legal Footer */}
          <div className="pt-12 border-t-2 border-slate-900 flex items-end justify-between">
            <div className="text-[10px] text-slate-500 max-w-sm space-y-0.5">
              <div>{settings.letterheadConfig.footerText}</div>
              <div>ABHA / ABDM Milestone 2 FHIR R4 Bundle Published.</div>
            </div>

            <div className="text-center w-56">
              <div className="font-serif italic text-base text-slate-700 tracking-wider">
                Dr. Gaurav Kumar
              </div>
              <div className="border-t border-slate-400 mt-1 pt-1 font-bold text-xs text-slate-900">
                Attending Doctor Signature
              </div>
              <div className="text-[10px] text-slate-500">MCI-2015-48291 (DM Cardiology)</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
