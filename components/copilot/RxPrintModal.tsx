"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Settings, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { PrintoutEngine, type MockPrintData } from "@/components/print/PrintoutEngine";
import {
  DEFAULT_PRINT_CONFIGS,
  type DefaultPrintConfig,
} from "@/services/domain/print-service";
import type { GroundedPrescriptionItem } from "@/services/domain/prescription-service";
import type { PrintTemplateType } from "@/db/schema/print-settings";

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
    address?: string | null;
  } | null;
  clinicName?: string;
}

export function RxPrintModal({
  open,
  onOpenChange,
  prescription,
  doctor,
  patient,
  clinicName = "Visual Eyez India: RE-Vision Optometry",
}: RxPrintModalProps) {
  const [templateType, setTemplateType] = React.useState<PrintTemplateType>("opd_treatment");
  const [config, setConfig] = React.useState<DefaultPrintConfig>(
    () => DEFAULT_PRINT_CONFIGS.opd_treatment
  );

  React.useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`/api/crm/print-settings?templateType=${templateType}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setConfig(json.data);
            return;
          }
        }
      } catch {
        // Fallback to default
      }
      setConfig(DEFAULT_PRINT_CONFIGS[templateType] || DEFAULT_PRINT_CONFIGS.opd_treatment);
    }

    if (open) {
      loadConfig();
    }
  }, [templateType, open]);

  if (!prescription && !patient) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const followUpFormatted = prescription?.followUpDate
    ? new Date(prescription.followUpDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "SOS / As needed";

  const transformedMedicines = (prescription?.items || []).map((m) => ({
    name: m.brandName || m.spokenName,
    dosage: m.dosage || m.strength || "1 Tab",
    frequency: m.frequency || "OD",
    duration: `${m.durationDays || 5} Days`,
    instructions: m.instructions || "After meals",
  }));

  const printData: MockPrintData = {
    clinicName,
    doctorName: doctor?.fullName ? `Dr. ${doctor.fullName.replace(/^Dr\.\s*/i, "")}` : "Dr. John Snow",
    doctorSpecialty: doctor?.specialty || "Senior Consultant Eye Surgeon & Physician",
    doctorRegNo: "MCI-48291-DL",
    uhid: patient?.uhid || "APX-2026-0042",
    patientName: patient?.fullName || "Rahul Sharma (PIHA A A)",
    age: patient?.age || 34,
    gender: patient?.gender || "Male",
    phone: patient?.phone || "+91 98719 00034",
    address: patient?.address || "House 14B, Alpha-1, Greater Noida, UP",
    date: formattedDate,
    complaints: prescription?.chiefComplaint ? [prescription.chiefComplaint] : undefined,
    diagnosis: prescription?.diagnosis || "Acute Upper Respiratory Infection",
    medicines: transformedMedicines.length > 0 ? transformedMedicines : undefined,
    followUp: followUpFormatted,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden p-0 print:p-0 print:border-none print:shadow-none print:max-w-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-[#2563EB]" />
            <DialogTitle className="text-sm font-bold text-slate-800">
              Clinical Printout ({templateType === "opd_treatment" ? "OPD Treatment" : "OPD Case Paper"})
            </DialogTitle>
          </div>

          <div className="flex items-center gap-2 pr-6">
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-md text-xs">
              <button
                type="button"
                onClick={() => setTemplateType("opd_treatment")}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  templateType === "opd_treatment"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                OPD Treatment (Rx)
              </button>
              <button
                type="button"
                onClick={() => setTemplateType("opd_case_paper")}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  templateType === "opd_case_paper"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                OPD Case Paper
              </button>
            </div>

            <Link
              href="/settings/printouts"
              target="_blank"
              className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-slate-200/50 transition-colors"
              title="Customize print layout in Settings"
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span>Layout Settings</span>
            </Link>

            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-[#2563EB] hover:bg-blue-700 text-white font-medium text-xs gap-1.5 h-8 cursor-pointer shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Clinical Document Canvas */}
        <div className="p-6 bg-slate-100 overflow-y-auto max-h-[82vh] flex justify-center print:p-0 print:bg-white print:max-h-none print:overflow-visible">
          <PrintoutEngine
            templateType={templateType}
            config={config}
            data={printData}
            zoom={0.92}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
