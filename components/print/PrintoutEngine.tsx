"use client";

import * as React from "react";
import type { PrintSettingsConfig, PrintTemplateType } from "@/db/schema/print-settings";
import { cn } from "@/lib/utils";

export interface MockPrintData {
  clinicName?: string;
  clinicTagline?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  doctorName?: string;
  doctorDegree?: string;
  doctorSpecialty?: string;
  doctorRegNo?: string;
  uhid?: string;
  patientName?: string;
  age?: number | string;
  gender?: string;
  phone?: string;
  address?: string;
  date?: string;
  time?: string;
  billNo?: string;
  ipdNo?: string;
  bedNo?: string;
  ward?: string;
  operatorName?: string;
  vitals?: {
    bp?: string;
    pulse?: string;
    spo2?: string;
    temp?: string;
    weight?: string;
    height?: string;
  };
  complaints?: string[];
  diagnosis?: string;
  medicines?: Array<{
    name: string;
    type?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }>;
  investigations?: string[];
  advice?: string[];
  followUp?: string;
  billingItems?: Array<{
    srNo: number;
    description: string;
    hsn: string;
    qty: number;
    rate: number;
    discount: number;
    amount: number;
  }>;
}

export const DEFAULT_MOCK_PRINT_DATA: MockPrintData = {
  clinicName: "Visual Eyez India: RE-Vision Optometry",
  clinicTagline: "Advanced Eye Care & Microsurgery Center",
  clinicAddress: "Plot C-36, Sector 20, Gautam Buddha Nagar, Noida, UP - 201301",
  clinicPhone: "+91 98719 00034 / +91 92050 40505",
  clinicEmail: "care@visualeyez.in",
  doctorName: "Dr. John Snow",
  doctorDegree: "MBBS, MS (Ophthalmology), FICO",
  doctorSpecialty: "Senior Consultant Eye Surgeon & Physician",
  doctorRegNo: "MCI-48291-DL",
  uhid: "APX-2026-0042",
  patientName: "Rahul Sharma (PIHA A A)",
  age: 34,
  gender: "Male",
  phone: "+91 98719 00034",
  address: "House 14B, Alpha-1, Greater Noida, UP",
  date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  time: "11:30 AM",
  billNo: "BILL/2026/0419",
  ipdNo: "IPD/2026/0088",
  bedNo: "Bed 204-A",
  ward: "Executive Semi-Private Ward",
  operatorName: "Pooja Verma (Billing Desk 1)",
  vitals: {
    bp: "122/80 mmHg",
    pulse: "76 bpm",
    spo2: "99% on RA",
    temp: "98.4 °F",
    weight: "68.5 kg",
    height: "174 cm",
  },
  complaints: [
    "Blurred vision and eye strain while working on screens since 2 weeks",
    "Occasional frontal headache in the evening",
    "Mild watering and burning sensation in bilateral eyes",
  ],
  diagnosis: "Compound Myopic Astigmatism (OD: -1.25DS/-0.50DC x 90, OS: -1.00DS/-0.50DC x 85) with Computer Vision Syndrome",
  medicines: [
    {
      name: "Systane Ultra Lubricant Eye Drops (Polyethylene Glycol)",
      type: "Eye Drops",
      dosage: "1 Drop",
      frequency: "1 Drop - 4 Times Daily (Both Eyes)",
      duration: "30 Days",
      instructions: "Instill 1 drop in each eye. Discard bottle 30 days after opening.",
    },
    {
      name: "Tab Bilashine 20mg (Bilastine)",
      type: "Tablet",
      dosage: "20 mg",
      frequency: "0 - 0 - 1 (Once daily at bedtime)",
      duration: "5 Days",
      instructions: "Take 1 hour before dinner or 2 hours after food.",
    },
    {
      name: "Olopat Eye Drops 0.1% (Olopatadine)",
      type: "Eye Drops",
      dosage: "1 Drop",
      frequency: "1 Drop - Twice daily (OD & OS)",
      duration: "10 Days",
      instructions: "Wait 10 minutes between instilling different eye drops.",
    },
    {
      name: "Cap Macuvision Plus (Lutein, Zeaxanthin & Astaxanthin)",
      type: "Capsule",
      dosage: "1 Cap",
      frequency: "1 - 0 - 0 (Once daily after breakfast)",
      duration: "30 Days",
      instructions: "Nutritional supplement for retinal macular wellness.",
    },
  ],
  investigations: [
    "Comprehensive Refraction & Slit Lamp Biomicroscopy",
    "Non-Contact Tonometry (IOP: OD 14 mmHg, OS 15 mmHg)",
    "Dilated Fundus Examination (90D Volk Lens - Both Eyes Normal)",
  ],
  advice: [
    "Follow 20-20-20 rule: Every 20 mins, look at an object 20 feet away for 20 seconds",
    "Use prescribed anti-reflective blue-filter spectacle lenses for VDU work",
    "Ensure adequate ambient lighting and maintain 25 inches monitor distance",
    "Avoid direct fan / air conditioner airflow onto face and eyes",
  ],
  followUp: "Review after 30 days for spectacle power verification, or SOS if redness occurs.",
  billingItems: [
    { srNo: 1, description: "Senior Consultant Eye Examination & Refraction", hsn: "999312", qty: 1, rate: 800, discount: 0, amount: 800 },
    { srNo: 2, description: "Slit Lamp Biomicroscopy & Dilated Fundus Exam", hsn: "999315", qty: 1, rate: 650, discount: 50, amount: 600 },
    { srNo: 3, description: "Non-Contact Tonometry (Bilateral Intraocular Pressure)", hsn: "999315", qty: 1, rate: 350, discount: 50, amount: 300 },
    { srNo: 4, description: "Corneal Pachymetry & Automated Keratometry", hsn: "999315", qty: 1, rate: 450, discount: 0, amount: 450 },
    { srNo: 5, description: "Dry Eye Tear Breakup Time (TBUT) & Schirmer Test", hsn: "999312", qty: 1, rate: 250, discount: 50, amount: 200 },
  ],
};

interface PrintoutEngineProps {
  templateType: PrintTemplateType;
  config: Partial<PrintSettingsConfig>;
  data?: Partial<MockPrintData>;
  zoom?: number;
  id?: string;
  className?: string;
}

export function PrintoutEngine({
  templateType,
  config,
  data = {},
  zoom = 1,
  id = "printout-paper",
  className,
}: PrintoutEngineProps) {
  const mergedData: MockPrintData = { ...DEFAULT_MOCK_PRINT_DATA, ...data };

  // Parse margins
  const marginTop = config.marginTop ? `${config.marginTop}in` : "0.25in";
  const marginBottom = config.marginBottom ? `${config.marginBottom}in` : "0.25in";
  const marginLeft = config.marginLeft ? `${config.marginLeft}in` : "0.25in";
  const marginRight = config.marginRight ? `${config.marginRight}in` : "0.25in";

  const fontSize = config.fontSize || 11;
  const lineSpacing = config.lineSpacing !== undefined ? config.lineSpacing : 3;
  const fontFamily = config.fontFamily || "Inter";
  const pageSize = config.pageSize || "A4";
  const columnType = config.columnType || "single";
  const columnWidth = Math.min(Math.max(config.columnWidth || 50, 10), 90);

  const isThermal = templateType === "thermal_print" || pageSize === "3in";
  const isDouble = columnType === "double" && !isThermal;

  // Billing Totals Calculations
  const grossTotal = mergedData.billingItems?.reduce((acc, it) => acc + it.rate * it.qty, 0) ?? 2500;
  const discountTotal = mergedData.billingItems?.reduce((acc, it) => acc + (it.discount || 0), 0) ?? 150;
  const netTotal = mergedData.billingItems?.reduce((acc, it) => acc + it.amount, 0) ?? 2350;

  // Paper Dimensions Style
  const paperDimensionsStyle: React.CSSProperties = isThermal
    ? {
        width: "78mm",
        minHeight: "140mm",
        padding: `${marginTop} ${marginRight} ${marginBottom} ${marginLeft}`,
        fontSize: `${fontSize}pt`,
        lineHeight: `${fontSize + lineSpacing}pt`,
        fontFamily,
      }
    : pageSize === "A5"
    ? {
        width: "148mm",
        minHeight: "210mm",
        padding: `${marginTop} ${marginRight} ${marginBottom} ${marginLeft}`,
        fontSize: `${fontSize}pt`,
        lineHeight: `${fontSize + lineSpacing}pt`,
        fontFamily,
      }
    : {
        width: "210mm",
        minHeight: "297mm",
        padding: `${marginTop} ${marginRight} ${marginBottom} ${marginLeft}`,
        fontSize: `${fontSize}pt`,
        lineHeight: `${fontSize + lineSpacing}pt`,
        fontFamily,
      };

  const leftWidthStyle: React.CSSProperties = isDouble ? { width: `${columnWidth}%` } : { width: "100%" };
  const rightWidthStyle: React.CSSProperties = isDouble ? { width: `${100 - columnWidth}%` } : { width: "100%" };

  return (
    <div
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: "top center",
        transition: "transform 0.15s ease-out",
      }}
      className={cn("flex justify-center print:block print:transform-none", className)}
    >
      <div
        id={id}
        style={paperDimensionsStyle}
        className={cn(
          "bg-white text-slate-900 border border-slate-300 shadow-xl relative select-text print:border-none print:shadow-none print:m-0",
          isThermal
            ? "font-mono print:w-[78mm] print:max-w-[78mm] print:mx-auto"
            : "print:w-full print:max-w-none print:min-h-0",
          className
        )}
      >
        {/* ============================================================== */}
        {/* HEADER SECTION                                                 */}
        {/* ============================================================== */}
        {config.displayHeader !== false && (
          <header className="border-b-2 border-slate-900 pb-3 mb-3">
            {isThermal ? (
              // Thermal Compact Header
              <div className="text-center space-y-1">
                <div className="font-extrabold text-base uppercase tracking-wider">{mergedData.clinicName}</div>
                <div className="text-[9pt] leading-tight text-slate-700">{mergedData.clinicAddress}</div>
                <div className="text-[9pt] font-semibold">Ph: {mergedData.clinicPhone}</div>
                {config.displayGstNumber !== false && (
                  <div className="text-[8.5pt] text-slate-600">GSTIN: 07AAAAA0000A1Z5</div>
                )}
                <div className="border-t border-dashed border-slate-400 my-1.5 pt-1 font-bold uppercase tracking-wider text-[10pt]">
                  {config.billHeader || "OPD Cash Receipt"}
                </div>
              </div>
            ) : (
              // Standard A4 / A5 Header
              <div className="flex items-start justify-between gap-4">
                {/* Left: Clinic Logo & Branding */}
                <div className="flex items-center gap-3.5">
                  {config.includeLogo !== false && (
                    <img
                      src={config.headerImageUrl || "/assets/print/clinic-logo.svg"}
                      alt="Clinic Logo"
                      style={{ height: `${(parseFloat(config.headerHeight || "1.25") * 38).toFixed(0)}px` }}
                      className="object-contain"
                    />
                  )}
                  <div>
                    <h1 className="font-extrabold text-[15pt] leading-tight text-slate-950 uppercase tracking-tight">
                      {mergedData.clinicName}
                    </h1>
                    <p className="text-[9pt] text-[#2563EB] font-semibold tracking-wide">
                      {mergedData.clinicTagline}
                    </p>
                    <p className="text-[8pt] text-slate-600 mt-0.5 leading-snug max-w-sm">
                      {mergedData.clinicAddress}
                    </p>
                    <p className="text-[8pt] text-slate-600 font-medium">
                      Tel: {mergedData.clinicPhone} | Web: www.visualeyez.in
                    </p>
                  </div>
                </div>

                {/* Right: Doctor Credentials or Barcode */}
                <div className="text-right flex flex-col items-end">
                  {config.displayDoctorDetails !== false && (
                    <div className="space-y-0.5">
                      <div className="font-bold text-[12pt] text-slate-900 leading-tight">
                        {mergedData.doctorName}
                      </div>
                      <div className="text-[8.5pt] font-semibold text-slate-700">
                        {mergedData.doctorDegree}
                      </div>
                      <div className="text-[8.5pt] text-[#2563EB] font-medium">
                        {mergedData.doctorSpecialty}
                      </div>
                      <div className="text-[7.5pt] text-slate-500 font-mono">
                        Reg No: {mergedData.doctorRegNo}
                      </div>
                    </div>
                  )}

                  {config.displayBarcode !== false && (
                    <div className="mt-2 flex flex-col items-end">
                      <img
                        src="/assets/print/barcode-sample.svg"
                        alt="Barcode"
                        className="h-8 object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </header>
        )}

        {/* ============================================================== */}
        {/* PATIENT DEMOGRAPHICS BAR                                       */}
        {/* ============================================================== */}
        <section
          className={cn(
            "border border-slate-300 rounded bg-slate-50/70 p-2 mb-3.5 text-[9pt]",
            isThermal && "border-dashed border-x-0 bg-transparent p-1 mb-2 text-[8.5pt]"
          )}
        >
          {isThermal ? (
            // Thermal Patient Line Items
            <div className="space-y-0.5 leading-tight">
              <div className="flex justify-between">
                <span>UHID: <strong>{mergedData.uhid}</strong></span>
                <span>Date: {mergedData.date}</span>
              </div>
              <div className="flex justify-between">
                <span>Pt: <strong>{mergedData.patientName}</strong></span>
                <span>{mergedData.age}Y / {mergedData.gender}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Bill: {mergedData.billNo}</span>
                <span>{mergedData.time}</span>
              </div>
              {config.displayOperatorName !== false && (
                <div className="text-slate-600 text-[8pt]">Op: {mergedData.operatorName}</div>
              )}
            </div>
          ) : (
            // Standard A4 / A5 Grid
            <div
              className={cn(
                "grid gap-x-4 gap-y-1.5",
                config.displayPatientDetailsInColumns !== false ? "grid-cols-4" : "grid-cols-2"
              )}
            >
              {config.visibleFields?.uhid !== false && (
                <div>
                  <span className="text-slate-500 text-[8pt] block uppercase font-medium">UHID / Patient ID</span>
                  <span className="font-bold text-slate-900 font-mono">{mergedData.uhid}</span>
                </div>
              )}
              {config.visibleFields?.patientName !== false && (
                <div>
                  <span className="text-slate-500 text-[8pt] block uppercase font-medium">Patient Name</span>
                  <span className="font-bold text-slate-900">{mergedData.patientName}</span>
                </div>
              )}
              {config.visibleFields?.age !== false && (
                <div>
                  <span className="text-slate-500 text-[8pt] block uppercase font-medium">Age / Gender</span>
                  <span className="font-semibold text-slate-800">{mergedData.age} Years / {mergedData.gender}</span>
                </div>
              )}
              {config.visibleFields?.phone !== false && (
                <div>
                  <span className="text-slate-500 text-[8pt] block uppercase font-medium">Phone / Contact</span>
                  <span className="font-medium text-slate-800">{mergedData.phone}</span>
                </div>
              )}

              {templateType.startsWith("ipd") && (
                <>
                  <div>
                    <span className="text-slate-500 text-[8pt] block uppercase font-medium">IPD Admission No</span>
                    <span className="font-bold text-slate-900 font-mono">{mergedData.ipdNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[8pt] block uppercase font-medium">Ward & Bed</span>
                    <span className="font-semibold text-slate-800">{mergedData.bedNo} ({mergedData.ward})</span>
                  </div>
                </>
              )}

              {templateType === "opd_billing" && (
                <>
                  <div>
                    <span className="text-slate-500 text-[8pt] block uppercase font-medium">Invoice Number</span>
                    <span className="font-bold text-slate-900 font-mono">{mergedData.billNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[8pt] block uppercase font-medium">Billing Operator</span>
                    <span className="font-semibold text-slate-800">{mergedData.operatorName}</span>
                  </div>
                </>
              )}

              {config.displayDateTime !== false && (
                <div>
                  <span className="text-slate-500 text-[8pt] block uppercase font-medium">Date & Time</span>
                  <span className="font-medium text-slate-800">{mergedData.date} {mergedData.time}</span>
                </div>
              )}

              {config.visibleFields?.address !== false && (
                <div className="col-span-2">
                  <span className="text-slate-500 text-[8pt] block uppercase font-medium">Address</span>
                  <span className="text-slate-800 truncate block">{mergedData.address}</span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ============================================================== */}
        {/* BODY CONTENT BY TEMPLATE TYPE                                  */}
        {/* ============================================================== */}
        <main className="space-y-4">
          {/* ======================= OPD TREATMENT (PRESCRIPTION) ======================= */}
          {templateType === "opd_treatment" && (
            <div className={cn(isDouble ? "flex flex-col md:flex-row gap-4 items-start" : "space-y-4")}>
              {/* Left Column (or Top in single column) */}
              <div style={leftWidthStyle} className="space-y-3.5 shrink-0">
                {/* Vitals Ribbon */}
                {config.displayVitals !== false && config.visibleFields?.vitals !== false && mergedData.vitals && (
                  <div className="border border-slate-200 rounded p-2 bg-slate-50 flex items-center justify-between text-[8.5pt]">
                    <div><span className="text-slate-500">BP:</span> <strong>{mergedData.vitals.bp}</strong></div>
                    <div><span className="text-slate-500">Pulse:</span> <strong>{mergedData.vitals.pulse}</strong></div>
                    <div><span className="text-slate-500">SpO2:</span> <strong>{mergedData.vitals.spo2}</strong></div>
                    <div><span className="text-slate-500">Temp:</span> <strong>{mergedData.vitals.temp}</strong></div>
                    <div><span className="text-slate-500">Wt:</span> <strong>{mergedData.vitals.weight}</strong></div>
                  </div>
                )}

                {/* Chief Complaints & Clinical Diagnosis */}
                {(config.visibleFields?.complaints !== false || config.visibleFields?.diagnosis !== false) && (
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-[9.5pt] uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5">
                      Clinical Diagnosis & Presenting Complaints
                    </h3>
                    <div className="text-[9pt] space-y-1">
                      {config.visibleFields?.diagnosis !== false && (
                        <div className="font-semibold text-slate-950">
                          <span className="text-slate-600 font-normal">Diagnosis: </span>
                          {mergedData.diagnosis}
                        </div>
                      )}
                      {config.visibleFields?.complaints !== false && (
                        <ul className="list-disc list-inside text-slate-700 pl-1 space-y-0.5">
                          {mergedData.complaints?.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* Advice & Instructions */}
                {config.visibleFields?.advice !== false && (
                  <div className="space-y-1 border border-slate-200 rounded p-2.5 bg-slate-50/40">
                    <h4 className="font-bold text-[8.5pt] uppercase tracking-wider text-slate-800">
                      Advice & Lifestyle Instructions
                    </h4>
                    <ul className="list-disc list-inside text-slate-700 text-[8pt] space-y-0.5">
                      {mergedData.advice?.map((adv, idx) => (
                        <li key={idx}>{adv}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column (or Bottom in single column) */}
              <div style={rightWidthStyle} className="space-y-3.5 flex-1 min-w-0">
                {/* Rx Medicine Table */}
                {config.visibleFields?.rx !== false && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 border-b border-slate-200 pb-0.5">
                      <span className="font-black text-[13pt] text-[#2563EB] leading-none">℞</span>
                      <h3 className="font-bold text-[9.5pt] uppercase tracking-wider text-slate-800">
                        Prescribed Medications (Rx)
                      </h3>
                    </div>

                    <table className="w-full text-left border-collapse border border-slate-300 text-[8.5pt]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                          <th className="p-1.5 border-r border-slate-300 w-8 text-center">#</th>
                          <th className="p-1.5 border-r border-slate-300">Medicine & Strength</th>
                          <th className="p-1.5 border-r border-slate-300 w-32">Dosage Frequency</th>
                          <th className="p-1.5 border-r border-slate-300 w-20 text-center">Duration</th>
                          <th className="p-1.5">Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mergedData.medicines?.map((m, idx) => (
                          <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50/50">
                            <td className="p-1.5 border-r border-slate-300 text-center font-semibold text-slate-600">
                              {idx + 1}
                            </td>
                            <td className="p-1.5 border-r border-slate-300 font-bold text-slate-900">
                              {m.name}
                            </td>
                            <td className="p-1.5 border-r border-slate-300 font-semibold text-[#2563EB]">
                              {m.frequency}
                            </td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-medium">
                              {m.duration}
                            </td>
                            <td className="p-1.5 text-slate-600 text-[8pt]">
                              {m.instructions}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Diagnostic Investigations */}
                {config.visibleFields?.investigations !== false && (
                  <div className="space-y-1 border border-slate-200 rounded p-2.5 bg-slate-50/40">
                    <h4 className="font-bold text-[8.5pt] uppercase tracking-wider text-slate-800">
                      Investigations Requested
                    </h4>
                    <ul className="list-disc list-inside text-slate-700 text-[8pt] space-y-0.5">
                      {mergedData.investigations?.map((inv, idx) => (
                        <li key={idx}>{inv}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Follow-up Note */}
                {config.visibleFields?.followUp !== false && (
                  <div className="border-l-2 border-[#2563EB] pl-2.5 text-[8.5pt] font-semibold text-slate-800">
                    <span className="text-slate-600 font-normal">Next Consultation / Follow-Up: </span>
                    {mergedData.followUp}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================= OPD CASE PAPER ======================= */}
          {templateType === "opd_case_paper" && (
            <div className={cn(isDouble ? "flex flex-col md:flex-row gap-4 items-start" : "space-y-3.5")}>
              {/* Left Column */}
              <div style={leftWidthStyle} className="space-y-3 shrink-0">
                <div className="border border-slate-200 rounded p-3 space-y-2">
                  <h3 className="font-bold text-[9.5pt] uppercase text-slate-800 border-b pb-1">
                    Clinical Examination & Findings
                  </h3>
                  <div className="space-y-2 text-[8.5pt]">
                    <div>
                      <span className="font-semibold text-slate-700 block">General Examination:</span>
                      <p className="text-slate-600">Patient conscious, oriented, afebrile, mild conjunctival congestion (+), pupillary reflexes brisk.</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700 block">Slit Lamp Findings:</span>
                      <p className="text-slate-600">Cornea clear, anterior chamber quiet, crystalline lens clear, IOP 14/15 mmHg.</p>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded p-3 space-y-1 text-[8.5pt]">
                  <h4 className="font-bold uppercase text-slate-800">Past Medical History & Allergies</h4>
                  <p className="text-slate-600">No known drug allergies reported. Mild seasonal rhinitis.</p>
                </div>
              </div>

              {/* Right Column */}
              <div style={rightWidthStyle} className="space-y-3 flex-1 min-w-0">
                <div className="border border-slate-200 rounded p-3 space-y-2">
                  <h3 className="font-bold text-[9.5pt] uppercase text-slate-800 border-b pb-1">
                    Provisional Diagnosis & Impression
                  </h3>
                  <p className="font-bold text-[9pt] text-slate-900">{mergedData.diagnosis}</p>
                  <p className="text-[8.5pt] text-slate-600">Advised corrective blue-filter glasses, ocular surface lubricants, and screen-time moderation.</p>
                </div>

                <div className="border border-slate-200 rounded p-3 space-y-2">
                  <h3 className="font-bold text-[9.5pt] uppercase text-slate-800 border-b pb-1">
                    Prescription Summary & Diagnostics
                  </h3>
                  <div className="space-y-2 text-[8.5pt]">
                    <div>
                      <span className="font-semibold block text-slate-700">Prescribed Rx:</span>
                      <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                        {mergedData.medicines?.map((m, i) => (
                          <li key={i}>{m.name} - {m.frequency}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold block text-slate-700">Investigations:</span>
                      <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                        {mergedData.investigations?.map((inv, i) => (
                          <li key={i}>{inv}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================= OPD CONSENT FORM ======================= */}
          {templateType === "opd_consent_form" && (
            <div className="space-y-3.5 text-[8.5pt] leading-relaxed">
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1.5">
                <h3 className="font-bold text-[10pt] text-slate-900 uppercase">
                  Patient Medical / Procedural Consent Declaration
                </h3>
                <p>
                  I, <strong>{mergedData.patientName}</strong>, aged <strong>{mergedData.age}</strong> years, hereby voluntarily authorize and give my informed consent to <strong>{mergedData.doctorName}</strong> and their certified medical team at {mergedData.clinicName} to perform the recommended clinical consultation, diagnostic procedures, investigations, and therapeutic interventions.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-[9pt] text-slate-800 uppercase">Risks, Benefits & Alternatives Explained:</h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
                  <li>The clinical nature, purpose, potential benefits, and known foreseeable complications of the diagnostic and therapeutic interventions have been explained to me in a language that I completely comprehend.</li>
                  <li>I acknowledge that no absolute guarantee or assurance has been given regarding the precise outcome or cure.</li>
                  <li>I confirm that I have disclosed all relevant past medical conditions, allergic reactions, and current medications accurately.</li>
                  <li>In the event of unforeseen complications during the procedure, I authorize the attending clinical team to perform such emergency medical procedures as are deemed clinically necessary.</li>
                </ol>
              </div>

              {/* Kin / Relative Block */}
              <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50 space-y-1 text-[8pt]">
                <div className="font-bold text-slate-800">Guardian / Next of Kin Declaration (if patient is minor or incapacitated):</div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-slate-700">
                  <div>Kin Name: _____________________</div>
                  <div>Relation: _____________________</div>
                  <div>Contact No: _____________________</div>
                </div>
              </div>
            </div>
          )}

          {/* ======================= IPD DOCUMENT (DISCHARGE SUMMARY) ======================= */}
          {templateType === "ipd_document" && (
            <div className={cn(isDouble ? "flex flex-col md:flex-row gap-4 items-start" : "space-y-3 text-[8.5pt]")}>
              <div style={leftWidthStyle} className="space-y-3 shrink-0">
                <div className="border border-slate-200 rounded p-2.5 bg-slate-50 space-y-1.5">
                  <div>
                    <span className="font-semibold text-slate-600 block text-[8pt]">Admission Diagnosis:</span>
                    <span className="font-bold text-slate-900 text-[8.5pt]">{mergedData.diagnosis}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600 block text-[8pt]">Discharge Condition:</span>
                    <span className="font-bold text-emerald-700 text-[8.5pt]">Hemodynamically Stable & Normal Vision</span>
                  </div>
                </div>

                <div className="space-y-1 text-[8.5pt]">
                  <h4 className="font-bold text-[9pt] uppercase text-slate-800">Brief Hospital Course & Summary:</h4>
                  <p className="text-slate-700 leading-normal">
                    Patient admitted for day-care procedure on {mergedData.date}. Monitored post-procedure with vital signs stable. Fit for discharge on oral step-down therapy.
                  </p>
                </div>
              </div>

              <div style={rightWidthStyle} className="space-y-3 flex-1 min-w-0">
                <div className="space-y-1 text-[8.5pt]">
                  <h4 className="font-bold text-[9pt] uppercase text-slate-800">Discharge Medications (Oral Step-Down):</h4>
                  <table className="w-full border-collapse border border-slate-300 text-[8pt]">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b border-slate-300">
                        <th className="p-1 border-r text-center w-8">#</th>
                        <th className="p-1 border-r">Medication</th>
                        <th className="p-1 border-r w-28">Dosage</th>
                        <th className="p-1 border-r w-20 text-center">Duration</th>
                        <th className="p-1">Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mergedData.medicines?.map((m, i) => (
                        <tr key={i} className="border-b border-slate-200">
                          <td className="p-1 border-r text-center">{i + 1}</td>
                          <td className="p-1 border-r font-semibold">{m.name}</td>
                          <td className="p-1 border-r text-[#2563EB]">{m.frequency}</td>
                          <td className="p-1 border-r text-center">{m.duration}</td>
                          <td className="p-1 text-slate-600">{m.instructions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================= IPD TREATMENT (MEDICATION CHART) ======================= */}
          {templateType === "ipd_treatment" && (
            <div className="space-y-3 text-[8pt]">
              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full text-left border-collapse text-[7.5pt]">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                      <th className="p-1.5 border-r border-slate-300">Drug Name & Route</th>
                      <th className="p-1.5 border-r border-slate-300 w-16 text-center">Dose</th>
                      <th className="p-1.5 border-r border-slate-300 w-16 text-center">Frequency</th>
                      <th className="p-1.5 border-r border-slate-300 w-14 text-center">08:00</th>
                      <th className="p-1.5 border-r border-slate-300 w-14 text-center">14:00</th>
                      <th className="p-1.5 border-r border-slate-300 w-14 text-center">20:00</th>
                      <th className="p-1.5 border-r border-slate-300 w-14 text-center">02:00</th>
                      <th className="p-1.5 text-center">Nurse Sign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedData.medicines?.map((med, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="p-1.5 border-r border-slate-300 font-bold">{med.name} (Oral)</td>
                        <td className="p-1.5 border-r border-slate-300 text-center">{med.dosage}</td>
                        <td className="p-1.5 border-r border-slate-300 text-center">{med.frequency}</td>
                        <td className="p-1.5 border-r border-slate-300 text-center text-emerald-700 font-bold">✓ Given</td>
                        <td className="p-1.5 border-r border-slate-300 text-center text-emerald-700 font-bold">✓ Given</td>
                        <td className="p-1.5 border-r border-slate-300 text-center text-slate-400">Due</td>
                        <td className="p-1.5 border-r border-slate-300 text-center text-slate-400">-</td>
                        <td className="p-1.5 text-center font-mono text-[7pt]">RN. Sneha</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================= IPD INITIAL ASSESSMENT ======================= */}
          {templateType === "ipd_initial_assessment" && (
            <div className={cn(isDouble ? "flex flex-col md:flex-row gap-4 items-start" : "space-y-3 text-[8.5pt]")}>
              <div style={leftWidthStyle} className="border border-slate-200 rounded p-2.5 space-y-1.5 shrink-0 text-[8.5pt]">
                <h4 className="font-bold text-[9pt] uppercase text-slate-800 border-b pb-0.5">Nursing Triage Assessment</h4>
                <div><span className="text-slate-500">Mode of Arrival:</span> Wheelchair / Ambulatory</div>
                <div><span className="text-slate-500">Consciousness:</span> Alert & Oriented (GCS 15/15)</div>
                <div><span className="text-slate-500">Pain Score (0-10):</span> 2/10 (Mild eye strain)</div>
                <div><span className="text-slate-500">Known Allergies:</span> None reported</div>
              </div>

              <div style={rightWidthStyle} className="border border-slate-200 rounded p-2.5 space-y-1.5 flex-1 min-w-0 text-[8.5pt]">
                <h4 className="font-bold text-[9pt] uppercase text-slate-800 border-b pb-0.5">Fall Risk & Pressure Ulcer Score</h4>
                <div><span className="text-slate-500">Morse Fall Scale:</span> Low Risk (Score: 10)</div>
                <div><span className="text-slate-500">Braden Scale:</span> 22 (No Risk)</div>
                <div><span className="text-slate-500">Bowel / Bladder:</span> Intact & Continent</div>
                <div><span className="text-slate-500">Dietary Needs:</span> Normal diet</div>
              </div>
            </div>
          )}

          {/* ======================= LAB / PHARMACY ORDER ======================= */}
          {templateType === "lab_order" && (
            <div className="space-y-3 text-[8.5pt]">
              <div className="flex justify-between items-center bg-slate-50 p-2 border border-slate-200 rounded">
                <div><span className="text-slate-600">Sample Priority:</span> <strong className="text-blue-700">ROUTINE</strong></div>
                <div><span className="text-slate-600">Phlebotomist:</span> <strong>Ramesh Kumar</strong></div>
                <div><span className="text-slate-600">Collection Date:</span> <strong>{mergedData.date}</strong></div>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-[8.5pt]">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300">
                    <th className="p-1.5 border-r text-center w-8">#</th>
                    <th className="p-1.5 border-r">Investigation / Test Name</th>
                    <th className="p-1.5 border-r w-36">Sample Type & Container</th>
                    <th className="p-1.5 border-r w-28 text-center">Turnaround Time</th>
                    <th className="p-1.5 text-center w-24">Barcode ID</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedData.investigations?.map((inv, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-1.5 border-r text-center font-bold text-slate-600">{idx + 1}</td>
                      <td className="p-1.5 border-r font-semibold text-slate-900">{inv}</td>
                      <td className="p-1.5 border-r text-slate-600">Clinical Test Slip</td>
                      <td className="p-1.5 border-r text-center">Same Day</td>
                      <td className="p-1.5 text-center font-mono text-[7.5pt]">LAB-2026-{idx + 10}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ======================= OPD BILLING (INVOICE) ======================= */}
          {templateType === "opd_billing" && (
            <div className="space-y-3 text-[8.5pt]">
              <table className="w-full border-collapse border border-slate-300 text-[8.5pt]">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                    <th className="p-1.5 border-r text-center w-8">#</th>
                    <th className="p-1.5 border-r">Service / Tariff Description</th>
                    {config.displayHsnCode !== false && (
                      <th className="p-1.5 border-r text-center w-20">{config.hsnCodeLabel || "HSN/SAC"}</th>
                    )}
                    <th className="p-1.5 border-r text-center w-12">Qty</th>
                    <th className="p-1.5 border-r text-right w-20">Rate (₹)</th>
                    <th className="p-1.5 border-r text-right w-16">Disc (₹)</th>
                    <th className="p-1.5 text-right w-24">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedData.billingItems?.map((item) => (
                    <tr key={item.srNo} className="border-b border-slate-200">
                      <td className="p-1.5 border-r text-center text-slate-600">{item.srNo}</td>
                      <td className="p-1.5 border-r font-semibold text-slate-900">{item.description}</td>
                      {config.displayHsnCode !== false && (
                        <td className="p-1.5 border-r text-center font-mono text-[7.5pt]">{item.hsn}</td>
                      )}
                      <td className="p-1.5 border-r text-center">{item.qty}</td>
                      <td className="p-1.5 border-r text-right">{item.rate.toFixed(2)}</td>
                      <td className="p-1.5 border-r text-right text-rose-600">
                        {item.discount > 0 ? `-${item.discount.toFixed(2)}` : "0.00"}
                      </td>
                      <td className="p-1.5 text-right font-bold text-slate-900">{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Dynamic Invoice Totals Summary */}
              <div className="flex justify-end">
                <div className="w-64 border border-slate-200 rounded p-2.5 bg-slate-50 space-y-1 text-[8.5pt]">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Total:</span>
                    <span>₹ {grossTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount:</span>
                    <span>- ₹ {discountTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (0% - Healthcare):</span>
                    <span>₹ 0.00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (0% - Healthcare):</span>
                    <span>₹ 0.00</span>
                  </div>
                  <div className="border-t border-slate-300 pt-1 flex justify-between font-extrabold text-[10pt] text-slate-900">
                    <span>Net Payable:</span>
                    <span className="text-[#2563EB]">₹ {netTotal.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1 text-[7.5pt] text-slate-500">
                    Paid via UPI (Txn: UPI/64829104) • Received with Thanks
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================= THERMAL PRINT (POS 80mm) ======================= */}
          {templateType === "thermal_print" && (
            <div className="space-y-1.5 text-[8pt]">
              <div className="border-b border-dashed border-slate-400 pb-1">
                <div className="flex justify-between font-bold text-[8.5pt]">
                  <span>Item</span>
                  <span>Qty × Rate = Total</span>
                </div>
              </div>

              <div className="space-y-1">
                {mergedData.billingItems?.map((b) => (
                  <div key={b.srNo} className="space-y-0.5">
                    <div className="font-semibold truncate">{b.description}</div>
                    <div className="flex justify-between text-[7.5pt] text-slate-700">
                      <span>{b.qty} × ₹{b.rate}</span>
                      <span>₹{b.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-1 space-y-0.5 text-[8pt]">
                <div className="flex justify-between">
                  <span>Gross Total:</span>
                  <span>₹ {grossTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-₹ {discountTotal.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-900 pt-1 flex justify-between font-bold text-[9pt]">
                  <span>NET PAID:</span>
                  <span>₹ {netTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[7.5pt]">
                  <span>Tendered: UPI / QR</span>
                  <span>Status: SETTLED</span>
                </div>
              </div>

              {config.displayBarcode !== false && (
                <div className="pt-2 flex flex-col items-center">
                  <img
                    src="/assets/print/barcode-sample.svg"
                    alt="Receipt Barcode"
                    className="h-7 object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </main>

        {/* ============================================================== */}
        {/* FOOTER & SIGNATURES SECTION                                   */}
        {/* ============================================================== */}
        {config.displayFooter !== false && (
          <footer className="mt-6 pt-3 border-t border-slate-300">
            {isThermal ? (
              // Thermal Centered Footer
              <div className="text-center text-[7.5pt] space-y-1 pt-1">
                <div>{config.footerText || "Thank you for visiting Visual Eyez India. Get well soon!"}</div>
                <div className="text-slate-500 font-mono">*** COMPUTER GENERATED POS RECEIPT ***</div>
              </div>
            ) : (
              // Standard A4 / A5 Signatures & Footer Strip
              <div className="space-y-4">
                {/* Signatures Block */}
                <div className="flex items-end justify-between px-2 pt-2">
                  {/* Patient / Kin Signature (if enabled or consent form) */}
                  {config.patientKinSignature && (
                    <div className="text-left space-y-1">
                      <div className="h-10 border-b border-dashed border-slate-400 w-44" />
                      <div className="text-[8pt] font-semibold text-slate-700">
                        Patient / Relative Signature
                      </div>
                      <div className="text-[7pt] text-slate-400">Date & Time Stamp</div>
                    </div>
                  )}

                  {/* Stamp in Center */}
                  <div className="opacity-80">
                    <img
                      src="/assets/print/clinic-stamp.svg"
                      alt="Clinic Official Stamp"
                      className="h-14 w-14 object-contain"
                    />
                  </div>

                  {/* Doctor Signature Block */}
                  {config.displaySignature !== false && (
                    <div className="text-right space-y-1">
                      <div className="flex justify-end">
                        <img
                          src="/assets/print/doctor-signature.svg"
                          alt="Doctor Signature"
                          className="h-10 object-contain"
                        />
                      </div>
                      <div className="text-[8.5pt] font-bold text-slate-900 border-t border-slate-400 pt-0.5 min-w-44 text-center">
                        {mergedData.doctorName}
                      </div>
                      <div className="text-[7.5pt] text-slate-500 text-center">
                        Authorized Signatory ({mergedData.doctorRegNo})
                      </div>
                    </div>
                  )}
                </div>

                {/* Multi-Branch Clinic Strip */}
                {config.footerImageUrl !== null && (
                  <div className="pt-2">
                    <img
                      src={config.footerImageUrl || "/assets/print/clinic-footer-branches.svg"}
                      alt="Clinic Multi-Branch Footer"
                      className="w-full object-contain"
                    />
                  </div>
                )}

                {/* Bottom Disclaimer */}
                {config.footerText && !config.footerImageUrl && (
                  <p className="text-center text-[7.5pt] text-slate-500 italic">
                    {config.footerText}
                  </p>
                )}
              </div>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
