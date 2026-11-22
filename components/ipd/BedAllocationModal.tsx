"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { handleEnterNavigation } from "@/utils/form-navigation";
import { clinicalStore, useClinicalStore } from "@/services/clinical-store";
import type { Bed, Patient } from "@/types/hms";
import { BedDouble, UserPlus, Search } from "lucide-react";

interface BedAllocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBed: Bed | null;
  onSuccess?: () => void;
}

export function BedAllocationModal({
  open,
  onOpenChange,
  selectedBed,
  onSuccess,
}: BedAllocationModalProps) {
  const store = useClinicalStore();
  const [patientSearch, setPatientSearch] = React.useState("");

  const doctors = React.useMemo(() => {
    return store.staff.filter(
      (s) =>
        s.role === "doctor" ||
        s.role.includes("doctor") ||
        s.role.includes("consultant") ||
        s.role.includes("specialist")
    );
  }, [store.staff]);

  const [formData, setFormData] = React.useState({
    patientId: "",
    patientName: "",
    admittingDoctor: "",
    reason: "",
    advanceDeposit: 0,
  });

  React.useEffect(() => {
    if (open) {
      setFormData({
        patientId: "",
        patientName: "",
        admittingDoctor: doctors[0]?.name || "",
        reason: "",
        advanceDeposit: 0,
      });
      setPatientSearch("");
    }
  }, [open, doctors]);

  const patientSuggestions = React.useMemo(() => {
    if (!patientSearch.trim()) return [];
    const clean = patientSearch.toLowerCase();
    return store.patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(clean) ||
        p.phone.includes(clean) ||
        p.uhid.toLowerCase().includes(clean)
    );
  }, [patientSearch, store.patients]);

  const selectPatient = (p: Patient) => {
    setFormData((prev) => ({
      ...prev,
      patientId: p.id,
      patientName: p.fullName,
    }));
    setPatientSearch("");
  };

  const handleAllocate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBed || !formData.patientName) return;

    clinicalStore.allocateBed(selectedBed.id, {
      patientId: formData.patientId,
      patientName: formData.patientName,
      admittingDoctor: formData.admittingDoctor,
      reason: formData.reason,
      advance: formData.advanceDeposit,
    });

    if (onSuccess) onSuccess();
    onOpenChange(false);
  };

  if (!selectedBed) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <BedDouble className="h-4 w-4 text-[#2563EB]" />
            Allocate Bed {selectedBed.bedNumber} ({selectedBed.wardName})
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleAllocate}
          onKeyDown={(e) => handleEnterNavigation(e)}
          className="space-y-4 py-2"
        >
          {/* Autocomplete Patient */}
          <div className="relative">
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Select Patient for Admission *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search registered patients (Name, UHID, Phone)..."
                className="pl-9 text-xs h-9"
              />
            </div>

            {patientSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg p-1 divide-y divide-slate-100">
                {patientSuggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPatient(p)}
                    className="w-full p-2 text-left hover:bg-blue-50 rounded flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-900">{p.fullName}</span>
                    <span className="font-mono text-slate-500">{p.uhid}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Patient Name</label>
              <Input
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Admitting Doctor</label>
              {doctors.length > 0 ? (
                <select
                  value={formData.admittingDoctor}
                  onChange={(e) => setFormData({ ...formData, admittingDoctor: e.target.value })}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800"
                  required
                >
                  <option value="">Select Doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.department})
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={formData.admittingDoctor}
                  onChange={(e) => setFormData({ ...formData, admittingDoctor: e.target.value })}
                  placeholder="Enter doctor name"
                  required
                />
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Clinical Admission Reason</label>
            <Input
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. Unstable Angina, Pre-op observation"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Daily Ward Rate</label>
              <div className="h-9 px-3 rounded-md bg-slate-100 border border-slate-200 flex items-center text-xs font-mono font-bold text-slate-800">
                ₹{selectedBed.dailyRate} / day
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Advance Deposit Collected (₹)</label>
              <Input
                type="number"
                value={formData.advanceDeposit}
                onChange={(e) => setFormData({ ...formData, advanceDeposit: parseFloat(e.target.value) || 0 })}
                className="font-mono font-bold"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#2563EB] hover:bg-blue-700">
              Confirm Bed Admission
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
