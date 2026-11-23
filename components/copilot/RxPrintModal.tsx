"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, X } from "lucide-react";
import type { GroundedPrescriptionItem } from "@/services/domain/prescription-service";

interface RxPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: {
    chiefComplaint?: string | null;
    diagnosis?: string | null;
    followUpDate?: string | Date | null;
    items?: GroundedPrescriptionItem[];
    approvedAt?: string | Date | null;
  } | null;
  doctor: {
    fullName: string;
    specialty: string;
    phoneE164?: string | null;
  } | null;
  patient: {
    fullName: string;
    uhid: string;
    age?: number | null;
    gender: string;
    phone: string;
    allergies?: string[] | null;
  } | null;
  clinicName?: string;
}

export function RxPrintModal({
  open,
  onOpenChange,
  prescription,
  doctor,
  patient,
  clinicName = "Apex Multispeciality Clinic & Hospital",
}: RxPrintModalProps) {
  if (!prescription) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const followUpFormatted = prescription.followUpDate
    ? new Date(prescription.followUpDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "SOS / As needed";

  const items = prescription.items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 print:p-0 print:border-none print:shadow-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-[#2563EB]" />
            <span className="font-semibold text-sm text-slate-800">Prescription A4 Print Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-[#2563EB] hover:bg-blue-700 text-white font-medium text-xs gap-1.5 h-8 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Clinical Document Canvas (A4 Standard) */}
        <div className="p-8 print:p-6 bg-white text-slate-900 font-sans print:m-0" id="rx-print-area">
          {/* Header & Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{clinicName}</h1>
              <p className="text-xs text-slate-500 font-medium">Ayushman Bharat Digital Mission (ABDM) Integrated Healthcare Facility</p>
              <p className="text-xs text-slate-500">Phone: +91 98765 43210 • Emergency: 108 / 112</p>
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-[#2563EB]">Dr. {doctor?.fullName || "Treating Physician"}</h2>
              <p className="text-xs font-semibold text-slate-700">{doctor?.specialty || "General Medicine"}</p>
              <p className="text-[11px] text-slate-500">Reg No: MCI-2018-98421</p>
            </div>
          </div>

          {/* Patient Details Demographic Strip */}
          <div className="grid grid-cols-4 gap-2 py-2.5 px-3 bg-slate-50 rounded border border-slate-200 text-xs mb-4">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Patient Name</span>
              <span className="font-bold text-slate-900">{patient?.fullName || "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">UHID / Phone</span>
              <span className="font-medium text-slate-800">{patient?.uhid || "UHID-TEMP"} • {patient?.phone || "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Age / Gender</span>
              <span className="font-medium text-slate-800">{patient?.age ? `${patient.age} Yrs` : "N/A"} / {patient?.gender || "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Date & Time</span>
              <span className="font-medium text-slate-800">{formattedDate}</span>
            </div>
          </div>

          {/* Clinical Findings Strip */}
          <div className="mb-4 grid grid-cols-2 gap-4 text-xs pb-3 border-b border-slate-100">
            {prescription.chiefComplaint && (
              <div>
                <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px] block mb-0.5">Chief Complaints</span>
                <p className="text-slate-800 font-medium">{prescription.chiefComplaint}</p>
              </div>
            )}
            {prescription.diagnosis && (
              <div>
                <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px] block mb-0.5">Provisional Diagnosis</span>
                <p className="text-[#2563EB] font-bold">{prescription.diagnosis}</p>
              </div>
            )}
          </div>

          {/* Rx Symbol */}
          <div className="flex items-center gap-2 mb-3">
            <span className="font-serif text-2xl font-bold text-slate-900 tracking-wider">℞</span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Prescribed Medication</span>
          </div>

          {/* Medicine Items Table */}
          <div className="border border-slate-200 rounded overflow-hidden mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-[11px] font-semibold uppercase border-b border-slate-200">
                  <th className="py-2 px-3 w-8">#</th>
                  <th className="py-2 px-3">Medicine & Salt Formulation</th>
                  <th className="py-2 px-3 w-24">Dosage</th>
                  <th className="py-2 px-3 w-28">Frequency</th>
                  <th className="py-2 px-3 w-20">Duration</th>
                  <th className="py-2 px-3">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                      No medications prescribed for this encounter.
                    </td>
                  </tr>
                ) : (
                  items.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-slate-900 block">{m.brandName || m.spokenName}</span>
                        {m.genericName && (
                          <span className="text-[10px] text-slate-500 italic block">{m.genericName} {m.strength || ""}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">{m.dosage || "-"}</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#2563EB] font-bold text-[10px]">
                          {m.frequency || "OD"}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">{m.durationDays} day(s)</td>
                      <td className="py-2 px-3 text-slate-600">{m.instructions || "As directed"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Follow-up & Footer Advice */}
          <div className="grid grid-cols-2 gap-6 text-xs pt-4 border-t border-slate-200 mb-8">
            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px] block mb-1">
                Advice & Follow-Up
              </span>
              <p className="text-slate-800">
                • Take prescribed medicines as directed after food unless specified.<br />
                • In case of adverse reaction or sudden high fever, contact clinic immediately.<br />
                • Next Follow-up: <strong className="text-[#2563EB]">{followUpFormatted}</strong>
              </p>
            </div>
            <div className="text-right flex flex-col justify-end items-end">
              <div className="h-12 w-32 border-b border-dashed border-slate-400 mb-1 flex items-end justify-center">
                <span className="font-serif italic text-xs text-slate-400">Dr. {doctor?.fullName?.split(" ")[0]} (Digital Sign)</span>
              </div>
              <span className="font-bold text-slate-900 text-xs">Dr. {doctor?.fullName || "Physician"}</span>
              <span className="text-[10px] text-slate-500">Authorized Medical Practitioner</span>
            </div>
          </div>

          {/* ABDM & Legal Disclaimer */}
          <div className="pt-3 border-t border-slate-100 text-[9px] text-slate-400 flex justify-between items-center">
            <span>Powered by Apex HMS Monolith • Generated on {formattedDate}</span>
            <span>ABDM Milestone 1 & 2 FHIR R4 Compliant EMR Record</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
