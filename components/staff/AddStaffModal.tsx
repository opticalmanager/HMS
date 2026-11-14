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
import { clinicalStore } from "@/services/clinical-store";
import { UserPlus } from "lucide-react";

interface AddStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddStaffModal({ open, onOpenChange, onSuccess }: AddStaffModalProps) {
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    role: "senior_consultant",
    department: "Cardiology",
    license: "",
    qualification: "",
    phone: "",
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.email) return;

    clinicalStore.addStaffMember({
      id: `usr-${Date.now()}`,
      ...formData,
      status: "active",
    });

    if (onSuccess) onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <UserPlus className="h-4 w-4 text-[#2563EB]" />
            Add Staff / Doctor Credential
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} onKeyDown={(e) => handleEnterNavigation(e)} className="space-y-3 py-2 text-xs">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Full Name & Title *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Rajesh Varma"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Hospital Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full h-8 rounded border border-slate-200 bg-white px-2 text-xs"
              >
                <option value="senior_consultant">Senior Consultant</option>
                <option value="junior_resident">Junior Resident</option>
                <option value="staff_nurse">Staff Nurse</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="chief_cashier">Chief Cashier</option>
                <option value="receptionist">Receptionist</option>
                <option value="lab_technician">Lab Technician</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Department *</label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Cardiology"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Medical Council Reg No *</label>
              <Input
                value={formData.license}
                onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                placeholder="e.g. MCI-2015-48291"
                className="font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Contact Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +91 98230 11111"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Official Email *</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. dr.rajesh@apexhospital.org"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Qualifications / Degrees</label>
            <Input
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              placeholder="e.g. MBBS, MD, DM"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#2563EB] hover:bg-blue-700">
              Register Staff Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
