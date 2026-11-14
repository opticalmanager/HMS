"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClinicalStore } from "@/services/clinical-store";
import type { Patient } from "@/types/hms";
import { Users, Search, CalendarPlus, Phone, CreditCard, ShieldCheck } from "lucide-react";

interface QuickPatientDirectoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookAppointment: (patient: Patient) => void;
}

export function QuickPatientDirectoryModal({
  open,
  onOpenChange,
  onBookAppointment,
}: QuickPatientDirectoryModalProps) {
  const store = useClinicalStore();
  const [search, setSearch] = React.useState("");

  const filteredPatients = React.useMemo(() => {
    if (!search.trim()) return store.patients;
    const q = search.toLowerCase();
    return store.patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.uhid.toLowerCase().includes(q) ||
        p.abhaId?.includes(q) ||
        p.city?.toLowerCase().includes(q)
    );
  }, [search, store.patients]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-[#2563EB]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Registered Patients Directory
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Search patient records, view demographics, and book direct appointment slots
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {store.patients.length} Total Patients
            </Badge>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative my-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name, mobile number, UHID, or ABHA ID..."
            className="pl-9 h-9 text-xs"
            autoFocus
          />
        </div>

        {/* Patients Table */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-36 text-xs">UHID</TableHead>
                <TableHead className="text-xs">Patient Name</TableHead>
                <TableHead className="text-xs">Age / Gender</TableHead>
                <TableHead className="text-xs">Contact</TableHead>
                <TableHead className="text-xs">ABHA Status</TableHead>
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                    No patient records found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-mono font-semibold text-xs text-[#2563EB]">
                      {p.uhid}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900">{p.fullName}</div>
                      {p.address && <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.address}</div>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 capitalize">
                      {p.age ? `${p.age}y` : "—"} • {p.gender}
                      {p.bloodGroup && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">
                          {p.bloodGroup}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-mono">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {p.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.abhaId ? (
                        <Badge variant="success" className="text-[10px] gap-1">
                          <ShieldCheck className="h-3 w-3" /> Linked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-slate-400">
                          Not Linked
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onOpenChange(false);
                          onBookAppointment(p);
                        }}
                        className="h-7 text-[11px] bg-[#2563EB] hover:bg-blue-700 gap-1 px-2.5"
                      >
                        <CalendarPlus className="h-3 w-3" /> Book Slot
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
