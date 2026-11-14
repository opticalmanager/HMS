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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClinicalStore } from "@/services/clinical-store";
import type { Appointment } from "@/types/hms";
import { Printer, Calendar } from "lucide-react";

interface PrintDayScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  selectedDoctorId?: string;
}

export function PrintDayScheduleModal({
  open,
  onOpenChange,
  selectedDate,
  selectedDoctorId = "all",
}: PrintDayScheduleModalProps) {
  const store = useClinicalStore();

  const dayAppointments = React.useMemo(() => {
    return store.appointments
      .filter((a) => {
        const matchesDate = a.appointmentDate === selectedDate;
        const matchesDoctor = selectedDoctorId === "all" || a.doctorId === selectedDoctorId;
        return matchesDate && matchesDoctor;
      })
      .sort((a, b) => a.tokenNumber - b.tokenNumber);
  }, [store.appointments, selectedDate, selectedDoctorId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-[#2563EB]">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Daily Appointment Schedule Sheet
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Printable A4 roster for doctor cabins and front-desk reception
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="bg-[#2563EB] hover:bg-blue-700 text-xs gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> Print Sheet (A4)
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Document Container */}
        <div className="border border-slate-200 rounded-lg p-6 bg-white mt-3 text-slate-900 font-sans print:border-none print:p-0">
          {/* Hospital Header */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                  {store.settings.hospitalName || "Apex Multispeciality Hospital"}
                </h2>
                <p className="text-xs text-slate-600">
                  {store.settings.address || "Main Healthcare Campus, New Delhi"} • Tel: {store.settings.phone || "+91 11 4903 8890"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded">
                  OPD Day Schedule
                </span>
                <p className="text-xs font-semibold text-slate-800 mt-1">Date: {selectedDate}</p>
              </div>
            </div>
          </div>

          {/* Roster Table */}
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-300 bg-slate-50">
                <TableHead className="w-16 text-center text-xs font-bold text-slate-800">Token</TableHead>
                <TableHead className="text-xs font-bold text-slate-800">Time</TableHead>
                <TableHead className="text-xs font-bold text-slate-800">UHID</TableHead>
                <TableHead className="text-xs font-bold text-slate-800">Patient Full Name</TableHead>
                <TableHead className="text-xs font-bold text-slate-800">Doctor &amp; Dept</TableHead>
                <TableHead className="text-xs font-bold text-slate-800">Status</TableHead>
                <TableHead className="w-28 text-xs font-bold text-slate-800 text-center">Vitals / Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dayAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-400">
                    No appointments scheduled for this date.
                  </TableCell>
                </TableRow>
              ) : (
                dayAppointments.map((a) => (
                  <TableRow key={a.id} className="border-b border-slate-200">
                    <TableCell className="text-center font-mono font-bold text-xs text-slate-900">
                      #{a.tokenNumber}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-medium">
                      {a.timeSlot}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600">
                      {a.patientUhid}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-900">
                      {a.patientName}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {a.doctorName}
                      <span className="block text-[10px] text-slate-400">{a.department}</span>
                    </TableCell>
                    <TableCell className="text-xs capitalize font-medium text-slate-700">
                      {a.status.replace("_", " ")}
                    </TableCell>
                    <TableCell className="border-l border-slate-200 h-8"></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>Generated from Apex HMS • Verified Medical Records</span>
            <span>Printed on: {new Date().toLocaleString()}</span>
          </div>
        </div>

        <DialogFooter className="print:hidden pt-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
