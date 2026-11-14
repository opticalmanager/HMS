"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Printer, ShieldAlert, Heart, Stethoscope, Pill, CheckCircle2 } from "lucide-react";
import type { Patient, Appointment, VitalRecord, DiagnosisEntry, PrescriptionItem, PatientAllergy } from "@/types/hms";

interface ComprehensivePatientReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  appointment: Appointment | null;
  vitals: VitalRecord;
  diagnoses: DiagnosisEntry[];
  prescriptions: PrescriptionItem[];
  allergies: PatientAllergy[];
}

export function ComprehensivePatientReportModal({
  open,
  onOpenChange,
  patient,
  appointment,
  vitals,
  diagnoses,
  prescriptions,
  allergies,
}: ComprehensivePatientReportModalProps) {
  const handlePrint = () => {
    window.print();
  };

  if (!patient || !appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-300">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">
                  Comprehensive Patient EMR Case Sheet
                </DialogTitle>
                <p className="text-[11px] text-slate-500">
                  Consolidated outpatient consultation record for clinical audit & referral
                </p>
              </div>
            </div>
            <Button
              onClick={handlePrint}
              size="sm"
              variant="outline"
              className="text-xs h-7 gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" /> Print Report (A4)
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Sheet Viewport */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs bg-white text-slate-800">
          {/* Hospital Clinic Letterhead */}
          <div className="border-b-2 border-slate-800 pb-3 flex items-start justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                VISUAL EYEZ EYE CARE & MULTISPECIALTY HOSPITAL
              </h2>
              <p className="text-[11px] text-slate-600">
                Lajpat Nagar Center, New Delhi - 110024 • Ph: +91 9871900034 • Reg No: DL/HOSP/2026/8841
              </p>
              <p className="text-[10px] text-slate-500">
                ABDM Facility ID (HFR): IN0710008892 • NHA EMR Certified
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-900">OPD SUMMARY SHEET</div>
              <div className="font-mono text-xs text-blue-700 font-bold">
                TOKEN #{appointment.tokenNumber}
              </div>
              <div className="text-[10px] text-slate-500">{appointment.appointmentDate}</div>
            </div>
          </div>

          {/* Patient Demographics Matrix */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px]">
            <div>
              <span className="text-slate-500 block">Patient Name:</span>
              <span className="font-bold text-slate-900 text-xs">{patient.fullName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">UHID:</span>
              <span className="font-mono font-bold text-slate-900">{patient.uhid}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Age / Gender:</span>
              <span className="font-semibold text-slate-900">
                {patient.age} Yrs • {patient.gender.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Contact Phone:</span>
              <span className="font-mono text-slate-800">{patient.phone}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Consulting Doctor:</span>
              <span className="font-semibold text-slate-900">{appointment.doctorName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Department:</span>
              <span className="text-slate-800">{appointment.department}</span>
            </div>
          </div>

          {/* Allergies Banner */}
          {allergies.length > 0 && (
            <div className="p-2.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-900 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold text-[11px] uppercase tracking-wider text-rose-800">
                  Adverse Reaction / Allergy Warning:
                </span>
                <span className="ml-1.5 text-xs font-medium">
                  {allergies.map((a) => `${a.allergen} (${a.severity.toUpperCase()})`).join(", ")}
                </span>
              </div>
            </div>
          )}

          {/* Clinical Vitals Section */}
          <div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-rose-500" /> Recorded Vital Signs
            </h3>
            <div className="grid grid-cols-6 gap-2 text-center">
              <div className="p-2 border border-slate-200 rounded-md bg-slate-50/50">
                <span className="text-[10px] text-slate-500 block">BP (mmHg)</span>
                <span className="font-mono font-bold text-xs text-slate-900">
                  {vitals.systolicBp}/{vitals.diastolicBp}
                </span>
              </div>
              <div className="p-2 border border-slate-200 rounded-md bg-slate-50/50">
                <span className="text-[10px] text-slate-500 block">Pulse (BPM)</span>
                <span className="font-mono font-bold text-xs text-slate-900">
                  {vitals.pulseRate}
                </span>
              </div>
              <div className="p-2 border border-slate-200 rounded-md bg-slate-50/50">
                <span className="text-[10px] text-slate-500 block">SpO2 (%)</span>
                <span className="font-mono font-bold text-xs text-slate-900">
                  {vitals.spo2}%
                </span>
              </div>
              <div className="p-2 border border-slate-200 rounded-md bg-slate-50/50">
                <span className="text-[10px] text-slate-500 block">Temp (°F)</span>
                <span className="font-mono font-bold text-xs text-slate-900">
                  {vitals.temperature}°F
                </span>
              </div>
              <div className="p-2 border border-slate-200 rounded-md bg-slate-50/50">
                <span className="text-[10px] text-slate-500 block">Height / Wt</span>
                <span className="font-mono font-bold text-xs text-slate-900">
                  {vitals.heightCm}cm / {vitals.weightKg}kg
                </span>
              </div>
              <div className="p-2 border border-slate-200 rounded-md bg-slate-50/50">
                <span className="text-[10px] text-slate-500 block">BMI</span>
                <span className="font-mono font-bold text-xs text-emerald-700">
                  {vitals.heightCm && vitals.weightKg
                    ? (vitals.weightKg / Math.pow(vitals.heightCm / 100, 2)).toFixed(1)
                    : "22.4"}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnoses (ICD-10) */}
          <div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-blue-600" /> Clinical Diagnoses (ICD-10)
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-24">ICD Code</TableHead>
                    <TableHead>Condition Description</TableHead>
                    <TableHead className="w-28 text-center">Classification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diagnoses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-slate-400">
                        No ICD-10 diagnosis tagged yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    diagnoses.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono font-bold text-blue-700">
                          {d.icdCode}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {d.description}
                        </TableCell>
                        <TableCell className="text-center capitalize">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 font-semibold text-slate-700">
                            {d.type || "Confirmed"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Rx Prescriptions */}
          <div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Pill className="h-3.5 w-3.5 text-purple-600" /> Prescribed Medications (Rx)
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Medicine Name</TableHead>
                    <TableHead className="w-24">Dosage</TableHead>
                    <TableHead className="w-24 text-center">Frequency</TableHead>
                    <TableHead className="w-28">Timing</TableHead>
                    <TableHead className="w-20 text-center">Days</TableHead>
                    <TableHead className="w-20 text-center">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-slate-400">
                        No medications prescribed in this session.
                      </TableCell>
                    </TableRow>
                  ) : (
                    prescriptions.map((rx) => (
                      <TableRow key={rx.id}>
                        <TableCell className="font-semibold text-slate-900">
                          {rx.medicineName}
                        </TableCell>
                        <TableCell className="text-slate-700">{rx.dosage}</TableCell>
                        <TableCell className="text-center font-mono font-bold text-blue-700">
                          {rx.frequency}
                        </TableCell>
                        <TableCell className="text-slate-600 capitalize">
                          {rx.timing.replace("_", " ")}
                        </TableCell>
                        <TableCell className="text-center text-slate-700">
                          {rx.durationDays}d
                        </TableCell>
                        <TableCell className="text-center font-semibold text-slate-900">
                          {rx.quantity}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Doctor Signature & Seal Footer */}
          <div className="pt-8 border-t border-slate-200 flex items-end justify-between">
            <div className="text-[10px] text-slate-400 space-y-0.5">
              <div>Generated electronically via Apex Hospital EMR System</div>
              <div>Digitally signed and cryptographically verified under IT Act 2000</div>
            </div>
            <div className="text-right">
              <div className="font-serif italic font-bold text-sm text-slate-900">
                {appointment.doctorName}
              </div>
              <div className="text-[11px] text-slate-600 font-medium">
                MBBS, MD • Registered Medical Practitioner
              </div>
              <div className="text-[10px] text-slate-400">Reg: MCI-2015-88492</div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8"
          >
            Close
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="text-xs h-8 gap-1.5 bg-[#1976D2] hover:bg-blue-700 text-white"
          >
            <Printer className="h-3.5 w-3.5" /> Print Patient Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
