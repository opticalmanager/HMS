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
import { clinicalStore } from "@/services/clinical-store";
import { formatSequenceNumber } from "@/utils/document-series";
import type { Patient, PatientGender, BloodGroup } from "@/types/hms";
import { UserPlus, Save, ShieldCheck, AlertCircle } from "lucide-react";

interface QuickPatientRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientCreated?: (patient: Patient) => void;
}

export function QuickPatientRegistrationModal({
  open,
  onOpenChange,
  onPatientCreated,
}: QuickPatientRegistrationModalProps) {
  const [activeTab, setActiveTab] = React.useState<"basic" | "kin">("basic");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    title: "Mr.",
    fullName: "",
    gender: "male" as PatientGender,
    age: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    bloodGroup: "B+" as BloodGroup,
    address: "",
    city: "",
    pincode: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "Relative",
    abhaId: "",
  });

  React.useEffect(() => {
    if (open) {
      setErrorMessage(null);
      setForm({
        title: "Mr.",
        fullName: "",
        gender: "male",
        age: "",
        dateOfBirth: "",
        phone: "",
        email: "",
        bloodGroup: "B+",
        address: "",
        city: "",
        pincode: "",
        emergencyName: "",
        emergencyPhone: "",
        emergencyRelation: "Relative",
        abhaId: "",
      });
    }
  }, [open]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSimulateAbha = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setForm((prev) => ({
      ...prev,
      abhaId: `91-${randomSuffix}-4521-8899`,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const cleanPhone = form.phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        setErrorMessage("Please enter a valid 10-digit mobile number.");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        fullName: `${form.title} ${form.fullName}`.trim(),
        gender: form.gender,
        phone: cleanPhone,
        age: form.age ? Number(form.age) : undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        email: form.email ? form.email.trim() : undefined,
        bloodGroup: form.bloodGroup,
        address: form.address || undefined,
        city: form.city || undefined,
        pincode: form.pincode || undefined,
        emergencyContactName: form.emergencyName
          ? `${form.emergencyName} (${form.emergencyRelation})`
          : undefined,
        emergencyContactPhone: form.emergencyPhone || undefined,
        emergencyContactRelation: form.emergencyRelation || undefined,
        abhaId: form.abhaId || undefined,
      };

      const res = await fetch("/api/crm/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register patient in clinic database.");
      }

      const registeredPatient = data.patient;

      // Update in-memory store for backwards compatibility with prototype components
      clinicalStore.addPatient({
        id: registeredPatient.id,
        uhid: registeredPatient.uhid,
        organizationId: registeredPatient.organizationId,
        branchId: registeredPatient.branchId || "br-main-001",
        fullName: registeredPatient.fullName,
        gender: registeredPatient.gender,
        age: registeredPatient.age || undefined,
        dateOfBirth: registeredPatient.dateOfBirth || undefined,
        phone: registeredPatient.phone,
        email: registeredPatient.email || undefined,
        bloodGroup: registeredPatient.bloodGroup,
        address: registeredPatient.address,
        city: registeredPatient.city,
        pincode: registeredPatient.pincode,
        emergencyContactName: registeredPatient.emergencyContactName,
        emergencyContactPhone: registeredPatient.emergencyContactPhone,
        abhaId: registeredPatient.abhaId,
        createdAt: registeredPatient.createdAt,
        updatedAt: registeredPatient.updatedAt,
      });

      if (onPatientCreated) {
        onPatientCreated(registeredPatient);
      }
      onOpenChange(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create patient. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                New Patient Registration
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Fast OPD front-desk onboarding with automatic UHID allocation
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 mt-2">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "basic"
                ? "border-[#2563EB] text-[#2563EB]"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            1. Basic Demographics &amp; Contact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("kin")}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "kin"
                ? "border-[#2563EB] text-[#2563EB]"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            2. Emergency Kin &amp; ABHA Health ID
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}
          {activeTab === "basic" ? (
            <>
              {/* Full Name & Title */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                  <select
                    value={form.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Master">Master</option>
                    <option value="Baby">Baby</option>
                    <option value="Dr.">Dr.</option>
                  </select>
                </div>
                <div className="col-span-9">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient Full Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    placeholder="Enter patient full name"
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Gender, Age, Blood Group */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => handleChange("gender", e.target.value as PatientGender)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Age (Years)</label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={form.age}
                    onChange={(e) => handleChange("age", e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={form.bloodGroup}
                    onChange={(e) => handleChange("bloodGroup", e.target.value as BloodGroup)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Mobile (10-Digit) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 10-digit mobile number"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="patient@example.com"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Address & City */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-8">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                  <Input
                    value={form.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Flat / House No, Street, Landmark"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
                  <Input
                    value={form.pincode}
                    maxLength={6}
                    onChange={(e) => handleChange("pincode", e.target.value.replace(/\D/g, ""))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Kin / Emergency Details */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-900">Emergency / Next of Kin Contact</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Relationship</label>
                    <select
                      value={form.emergencyRelation}
                      onChange={(e) => handleChange("emergencyRelation", e.target.value)}
                      className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Child">Child</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kin Full Name</label>
                    <Input
                      value={form.emergencyName}
                      onChange={(e) => handleChange("emergencyName", e.target.value)}
                      placeholder="e.g. Meera Patel"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kin Contact Number</label>
                    <Input
                      type="tel"
                      maxLength={10}
                      value={form.emergencyPhone}
                      onChange={(e) => handleChange("emergencyPhone", e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 9811002233"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* ABHA Integration */}
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    Ayushman Bharat Health Account (ABHA ID)
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSimulateAbha}
                    className="h-7 text-[11px] border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    Generate / Fetch Mock ABHA
                  </Button>
                </div>
                <Input
                  value={form.abhaId}
                  onChange={(e) => handleChange("abhaId", e.target.value)}
                  placeholder="14-digit ABHA Number (e.g. 91-4521-8899-1022)"
                  className="h-9 text-xs font-mono bg-white"
                />
                <p className="text-[11px] text-blue-700/80">
                  Allows seamless health record sharing under the Ayushman Bharat Digital Mission (ABDM).
                </p>
              </div>
            </>
          )}

          <DialogFooter className="pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#2563EB] hover:bg-blue-700 text-xs gap-1.5 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              {isSubmitting ? "Registering in Clinic Database..." : "Save & Generate UHID"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
