"use client";

import * as React from "react";
import {
  Users,
  Search,
  AlertTriangle,
  UserCheck,
  Stethoscope,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface QueueItem {
  id: string;
  tokenNumber: number;
  status: string;
  timeSlot: string;
  priority: string;
  chiefComplaints?: string | null;
  patientId: string;
  patientName: string;
  patientUhid: string;
  patientPhone: string;
  patientAge?: number | null;
  patientGender: string;
  patientAllergies?: string[] | null;
  doctorId: string;
  doctorName?: string | null;
}

interface DoctorItem {
  id: string;
  fullName: string;
  specialty: string;
  consultationFee: string;
  userId?: string | null;
}

interface SelectedPatient {
  id: string;
  fullName: string;
  uhid: string;
  gender: string;
  age?: number | null;
  phone: string;
  bloodGroup?: string | null;
  allergies?: string[] | null;
  chronicConditions?: string[] | null;
}

interface ContextRailProps {
  doctors: DoctorItem[];
  selectedDoctorId: string;
  onSelectDoctor: (docId: string) => void;
  queue: QueueItem[];
  selectedPatient: SelectedPatient | null;
  onSelectPatient: (patientId: string, appointmentId?: string) => void;
  isLoading?: boolean;
}

export function ContextRail({
  doctors,
  selectedDoctorId,
  onSelectDoctor,
  queue,
  selectedPatient,
  onSelectPatient,
  isLoading = false,
}: ContextRailProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredQueue = queue.filter(
    (q) =>
      q.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.patientUhid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.tokenNumber.toString().includes(searchQuery)
  );

  const activeDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  const patientAllergies = (selectedPatient?.allergies as string[]) || [];
  const patientChronic = (selectedPatient?.chronicConditions as string[]) || [];

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-full sm:w-72 lg:w-80 shrink-0 select-none overflow-hidden text-xs">
      {/* 1. Active Doctor Selector Strip */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/80">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
          Active Consulting Doctor
        </label>
        <div className="relative">
          <select
            value={selectedDoctorId}
            onChange={(e) => onSelectDoctor(e.target.value)}
            className="w-full h-8 pl-8 pr-7 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#2563EB] cursor-pointer appearance-none"
          >
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                Dr. {doc.fullName} ({doc.specialty})
              </option>
            ))}
          </select>
          <Stethoscope className="h-4 w-4 text-[#2563EB] absolute left-2.5 top-2 pointer-events-none" />
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* 2. Selected Patient Snapshot Card */}
      <div className="p-3 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Active Patient
          </span>
          {selectedPatient && (
            <Badge variant="outline" className="text-[9px] font-mono py-0 h-4 bg-blue-50 text-[#2563EB] border-blue-200">
              {selectedPatient.uhid}
            </Badge>
          )}
        </div>

        {selectedPatient ? (
          <div className="space-y-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 leading-tight">
                {selectedPatient.fullName}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedPatient.age ? `${selectedPatient.age} Yrs` : "N/A"} •{" "}
                <span className="capitalize">{selectedPatient.gender}</span> • Phone: {selectedPatient.phone}
                {selectedPatient.bloodGroup && ` • ${selectedPatient.bloodGroup}`}
              </p>
            </div>

            {/* Red Allergy Alert Badge (Mandatory Clinical Safety Guardrail) */}
            {patientAllergies.length > 0 ? (
              <div className="p-2 rounded-md bg-rose-50 border border-rose-200 text-rose-800">
                <div className="flex items-center gap-1 font-bold text-[10px] uppercase tracking-wide text-rose-700">
                  <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                  <span>Documented Allergies:</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {patientAllergies.map((allergy, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-200/80 text-rose-900"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>No known drug allergies on record</span>
              </div>
            )}

            {patientChronic.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {patientChronic.map((cond, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.2 rounded text-[9px] bg-slate-100 text-slate-600 border border-slate-200"
                  >
                    {cond}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 text-center text-slate-400 text-xs italic">
            Select a patient from today's queue below to begin consultation.
          </div>
        )}
      </div>

      {/* 3. Searchable OPD Queue for Today */}
      <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, token, UHID..."
            className="h-7 text-xs pl-7 bg-white"
          />
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/60 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
        <span>Today's OPD Queue ({queue.length})</span>
        <span>Token / Time</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
        {filteredQueue.length === 0 ? (
          <div className="py-8 text-center text-slate-400 italic text-xs">
            {searchQuery ? "No matching patients found in queue." : "No appointments for today."}
          </div>
        ) : (
          filteredQueue.map((item) => {
            const isSelected = selectedPatient?.id === item.patientId;
            const hasAllergies = (item.patientAllergies || []).length > 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPatient(item.patientId, item.id)}
                className={cn(
                  "w-full text-left p-2.5 rounded-md transition-colors flex items-start gap-2 cursor-pointer mb-0.5",
                  isSelected
                    ? "bg-blue-50/80 border border-[#2563EB]/40 shadow-2xs"
                    : "hover:bg-slate-50 border border-transparent"
                )}
              >
                <div
                  className={cn(
                    "h-6 w-6 rounded flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5",
                    isSelected
                      ? "bg-[#2563EB] text-white"
                      : "bg-slate-200 text-slate-700"
                  )}
                >
                  {item.tokenNumber}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 truncate">
                      {item.patientName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {item.timeSlot}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-slate-500 truncate">{item.patientUhid}</span>
                    <span className="text-slate-300">•</span>
                    <span
                      className={cn(
                        "text-[9px] font-semibold px-1 rounded uppercase",
                        item.status === "in_consultation"
                          ? "bg-amber-100 text-amber-800"
                          : item.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                    {hasAllergies && (
                      <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 rounded border border-rose-200">
                        Allergy
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
