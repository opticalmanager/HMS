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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clinicalStore, useClinicalStore } from "@/services/clinical-store";
import type { PatientAllergy, AllergyType, AllergySeverity } from "@/types/hms";
import { AlertTriangle, Plus, Trash2, ShieldAlert, Sparkles, Check } from "lucide-react";

interface PatientAllergyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
}

export function PatientAllergyModal({
  open,
  onOpenChange,
  patientId,
  patientName,
}: PatientAllergyModalProps) {
  const store = useClinicalStore();

  const [allergyType, setAllergyType] = React.useState<AllergyType>("drug");
  const [allergen, setAllergen] = React.useState("");
  const [severity, setSeverity] = React.useState<AllergySeverity>("moderate");
  const [reaction, setReaction] = React.useState("");
  const [onsetDate, setOnsetDate] = React.useState("");
  const [showAddForm, setShowAddForm] = React.useState(false);

  const patientAllergies = React.useMemo(() => {
    return store.patientAllergies.filter((a) => a.patientId === patientId);
  }, [store.patientAllergies, patientId]);

  const handleAddAllergy = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!allergen.trim()) return;

    // Check duplicate
    const exists = patientAllergies.some(
      (a) => a.allergen.toLowerCase() === allergen.trim().toLowerCase()
    );
    if (exists) {
      alert("This allergen is already documented for this patient.");
      return;
    }

    const newAllergy: PatientAllergy = {
      id: `allg-${Date.now()}`,
      patientId,
      allergyType,
      allergen: allergen.trim(),
      severity,
      reaction: reaction.trim() || "Clinical sensitivity observed",
      onsetDate: onsetDate || new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };

    clinicalStore.addPatientAllergy(newAllergy);
    setAllergen("");
    setReaction("");
    setOnsetDate("");
    setShowAddForm(false);
  };

  const handleRemove = (id: string) => {
    clinicalStore.removePatientAllergy(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-300">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">
                  Patient Allergy Records
                </DialogTitle>
                <p className="text-[11px] text-slate-500">
                  Documented sensitivities and adverse drug reaction alerts for {patientName}
                </p>
              </div>
            </div>
            <Badge
              variant={patientAllergies.length > 0 ? "danger" : "outline"}
              className="text-xs"
            >
              {patientAllergies.length} Active {patientAllergies.length === 1 ? "Alert" : "Alerts"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Allergies Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead>Allergen / Substance</TableHead>
                  <TableHead className="w-24">Severity</TableHead>
                  <TableHead>Clinical Reaction</TableHead>
                  <TableHead className="w-12 text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patientAllergies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-slate-400">
                      No documented drug or food allergies on file for this patient.
                    </TableCell>
                  </TableRow>
                ) : (
                  patientAllergies.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="capitalize font-medium text-slate-700">
                        {item.allergyType}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {item.allergen}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.severity === "severe"
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : item.severity === "moderate"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {item.severity}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {item.reaction}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                          title="Remove allergy"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Collapsible Add New Allergy Form */}
          {showAddForm ? (
            <form onSubmit={handleAddAllergy} className="border border-amber-200 rounded-lg p-3 bg-amber-50/40 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-amber-200/60">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  Add Adverse Reaction / Allergy Alert
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Allergy Type
                  </label>
                  <select
                    value={allergyType}
                    onChange={(e) => setAllergyType(e.target.value as AllergyType)}
                    className="w-full h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800"
                  >
                    <option value="drug">Drug / Medication</option>
                    <option value="food">Food Product</option>
                    <option value="environmental">Environmental (Pollen, Dust)</option>
                    <option value="contact">Contact Sensitivity (Latex, Metal)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Severity Rating
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as AllergySeverity)}
                    className="w-full h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800 font-semibold"
                  >
                    <option value="mild">Mild (Localized rash, mild itching)</option>
                    <option value="moderate">Moderate (Urticaria, facial flushing)</option>
                    <option value="severe">Severe (Anaphylaxis, airway compromise)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Allergen Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Penicillin, Sulfa, Paracetamol, Ciprofloxacin, Peanuts"
                    value={allergen}
                    onChange={(e) => setAllergen(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Clinical Reaction Observed
                  </label>
                  <Input
                    placeholder="e.g. Erythematous rash, bronchospasm, facial swelling"
                    value={reaction}
                    onChange={(e) => setReaction(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  size="sm"
                  className="h-7 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Check className="h-3 w-3" /> Save Allergy Record
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="text-xs h-8 gap-1.5 border-dashed border-slate-300 w-full hover:bg-slate-50 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-slate-500" />
              Document New Allergy
            </Button>
          )}
        </div>

        <DialogFooter className="p-3 border-t border-slate-100 bg-slate-50/70">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 ml-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
