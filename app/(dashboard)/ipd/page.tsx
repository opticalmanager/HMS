"use client";

import * as React from "react";
import {
  BedDouble,
  Plus,
  Filter,
  Users,
  ArrowRightLeft,
  ClipboardList,
  CheckCircle2,
  FileText,
  UserCheck,
  Clock,
  Sparkles,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BedGridVisualizer } from "@/components/ipd/BedGridVisualizer";
import { BedAllocationModal } from "@/components/ipd/BedAllocationModal";
import { DischargeSummaryModal } from "@/components/ipd/DischargeSummaryModal";
import { UniversalPrintModal } from "@/components/print/UniversalPrintModal";
import { useClinicalStore, clinicalStore } from "@/services/clinical-store";
import { IpdService } from "@/services/ipd.service";
import { formatCurrencyINR, formatClinicalDate } from "@/utils/formatting";
import type { Bed, IpdAdmission } from "@/types/hms";
import type { PrintTemplateType } from "@/db/schema/print-settings";

export default function IpdPage() {
  const store = useClinicalStore();
  const bedsList = store.beds;
  const admissions = store.admissions;
  const nursingMar = store.nursingMar;

  const [selectedWard, setSelectedWard] = React.useState<string>("all");
  const [activeTab, setActiveTab] = React.useState<string>("matrix");

  const [allocationModalOpen, setAllocationModalOpen] = React.useState(false);
  const [selectedBedForAllocation, setSelectedBedForAllocation] = React.useState<Bed | null>(null);

  const [dischargeModalOpen, setDischargeModalOpen] = React.useState(false);
  const [selectedAdmissionForDischarge, setSelectedAdmissionForDischarge] = React.useState<IpdAdmission | null>(null);

  const [marShiftFilter, setMarShiftFilter] = React.useState<string>("all");
  const [printModalOpen, setPrintModalOpen] = React.useState<boolean>(false);
  const [printTemplate, setPrintTemplate] = React.useState<PrintTemplateType>("ipd_document");

  const stats = React.useMemo(() => IpdService.calculateOccupancy(bedsList), [bedsList]);

  const filteredBeds = selectedWard === "all"
    ? bedsList
    : bedsList.filter((b) => b.wardType === selectedWard);

  const handleBedClick = (bed: Bed) => {
    if (bed.status === "available") {
      setSelectedBedForAllocation(bed);
      setAllocationModalOpen(true);
    } else {
      // Toggle bed status cycle: occupied -> cleaning -> available
      if (bed.status === "cleaning") {
        clinicalStore.updateBedStatus(bed.id, "available");
      } else if (bed.status === "occupied") {
        const confirmVacate = confirm(`Bed ${bed.bedNumber} is currently occupied by ${bed.patientName || "patient"}. Mark for cleaning/vacate?`);
        if (confirmVacate) {
          clinicalStore.updateBedStatus(bed.id, "cleaning");
        }
      }
    }
  };

  const handleToggleMar = (marId: string) => {
    clinicalStore.toggleNursingMarStatus(marId, "Sister Priyanka Nair");
  };

  const handleOpenDischarge = (adm: IpdAdmission) => {
    setSelectedAdmissionForDischarge(adm);
    setDischargeModalOpen(true);
  };

  const filteredMar = marShiftFilter === "all"
    ? nursingMar
    : nursingMar.filter((m) => m.shift === marShiftFilter);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">IPD Wards & Bed Occupancy</h1>
          <p className="text-xs text-slate-500">Live ward matrix, patient admissions, and nursing MAR checklists</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPrintTemplate("ipd_document");
              setPrintModalOpen(true);
            }}
            className="text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" /> Print Inpatient Records
          </Button>

          <Button
            size="sm"
            onClick={() => {
              const firstAvail = bedsList.find((b) => b.status === "available");
              if (firstAvail) {
                setSelectedBedForAllocation(firstAvail);
                setAllocationModalOpen(true);
              } else {
                alert("No beds currently available. Please discharge a patient or mark a bed cleaned.");
              }
            }}
            className="bg-[#2563EB] hover:bg-blue-700 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> New IPD Admission
          </Button>
        </div>
      </div>

      {/* Bed Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-slate-500">Total Hospital Beds</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-slate-500">Currently Occupied</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{stats.occupied}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-slate-500">Available Beds</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.available}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-slate-500">Occupancy Rate</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.occupancyRatePercent}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Bed Matrix vs Nursing MAR vs Admissions Register */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix">Bed Allocation Matrix</TabsTrigger>
          <TabsTrigger value="mar">Nursing MAR Checklist</TabsTrigger>
          <TabsTrigger value="admissions">Active Admissions ({admissions.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Visual Bed Matrix */}
        <TabsContent value="matrix" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Ward Filter Buttons: ICU, CCU, General Ward, Deluxe */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "All Wards" },
                { id: "icu", label: "ICU" },
                { id: "ccu", label: "CCU" },
                { id: "general", label: "General Ward" },
                { id: "deluxe", label: "Deluxe Suite" },
              ].map((w) => (
                <Button
                  key={w.id}
                  size="sm"
                  variant={selectedWard === w.id ? "default" : "outline"}
                  onClick={() => setSelectedWard(w.id)}
                  className="text-xs h-8"
                >
                  {w.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Occupied</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Cleaning</span>
            </div>
          </div>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                Live Bed Grid (Click Available Bed to Allocate, Occupied to Vacate)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BedGridVisualizer beds={filteredBeds} onSelectBed={handleBedClick} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Nursing MAR Shift Checklist */}
        <TabsContent value="mar" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#2563EB]" />
                  Nursing Medication Administration Record (MAR)
                </CardTitle>
                <p className="text-xs text-slate-500">Scheduled clinical drug rounds with nurse sign-off</p>
              </div>

              {/* Shift Filter */}
              <div className="flex items-center gap-1.5">
                {["all", "morning", "afternoon", "evening", "night"].map((sh) => (
                  <Button
                    key={sh}
                    size="sm"
                    variant={marShiftFilter === sh ? "default" : "outline"}
                    onClick={() => setMarShiftFilter(sh)}
                    className="capitalize text-xs h-7"
                  >
                    {sh}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Status</TableHead>
                    <TableHead>Bed & Patient</TableHead>
                    <TableHead>Medication & Dose</TableHead>
                    <TableHead>Shift & Due Time</TableHead>
                    <TableHead>Administered Details</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMar.map((mar) => {
                    const isGiven = mar.status === "given";
                    return (
                      <TableRow key={mar.id} className={isGiven ? "bg-emerald-50/40" : undefined}>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isGiven}
                            onChange={() => handleToggleMar(mar.id)}
                            className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 text-xs">{mar.patientName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">Bed: {mar.bedNumber}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 text-xs">{mar.medicationName}</div>
                          <div className="text-[11px] text-slate-500">{mar.dosage}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-[10px] bg-slate-50">
                            {mar.shift}
                          </Badge>
                          <div className="text-[11px] text-slate-500 mt-0.5">{mar.scheduledTime}</div>
                        </TableCell>
                        <TableCell>
                          {isGiven ? (
                            <div className="text-xs text-emerald-700">
                              <span className="font-semibold">Given at {mar.administeredTime}</span>
                              <div className="text-[10px] text-emerald-600">By {mar.administeredBy}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Pending administration</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={isGiven ? "outline" : "default"}
                            onClick={() => handleToggleMar(mar.id)}
                            className="h-7 text-xs"
                          >
                            {isGiven ? "Revert" : "Sign Off Dose"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Active Admissions & Discharge Generator */}
        <TabsContent value="admissions" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                Inpatient Admissions Register & Discharge Summaries
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission #</TableHead>
                    <TableHead>Admit Date</TableHead>
                    <TableHead>Reason for Admission</TableHead>
                    <TableHead className="text-right">Advance Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admissions.map((adm) => (
                    <TableRow key={adm.id}>
                      <TableCell className="font-mono font-bold text-xs text-[#2563EB]">
                        {adm.admissionNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-medium">
                        {formatClinicalDate(adm.admissionDate)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-900 max-w-xs truncate">
                        {adm.admissionReason}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-900 text-xs">
                        {formatCurrencyINR(adm.totalAdvancePaid)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">{adm.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenDischarge(adm)}
                          className="h-7 text-xs gap-1 bg-[#2563EB] hover:bg-blue-700"
                        >
                          <FileText className="h-3 w-3" /> Discharge Summary
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bed Allocation Modal */}
      <BedAllocationModal
        open={allocationModalOpen}
        onOpenChange={setAllocationModalOpen}
        selectedBed={selectedBedForAllocation}
      />

      {/* Discharge Summary Generator Modal */}
      <DischargeSummaryModal
        open={dischargeModalOpen}
        onOpenChange={setDischargeModalOpen}
        admission={selectedAdmissionForDischarge}
      />

      {/* Universal Inpatient Print Engine Modal */}
      <UniversalPrintModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        templateType={printTemplate}
        title="Inpatient Clinical Document"
        availableTemplates={[
          { id: "ipd_document", label: "Discharge Summary" },
          { id: "ipd_initial_assessment", label: "Initial Assessment" },
          { id: "ipd_treatment", label: "Medication Chart" },
        ]}
      />
    </div>
  );
}
