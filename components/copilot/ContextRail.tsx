"use client";

import * as React from "react";
import {
  Users,
  Search,
  AlertTriangle,
  UserCheck,
  UserPlus,
  Stethoscope,
  CheckCircle2,
  ChevronDown,
  X,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuickPatientRegistrationModal } from "@/components/appointments/QuickPatientRegistrationModal";

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
  const [directoryResults, setDirectoryResults] = React.useState<SelectedPatient[]>([]);
  const [isSearchingDirectory, setIsSearchingDirectory] = React.useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = React.useState(false);

  // Filter in-memory today's appointment queue
  const filteredQueue = queue.filter(
    (q) =>
      q.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.patientUhid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.tokenNumber.toString().includes(searchQuery)
  );

  // Live async clinic patient directory search (walk-ins / any registered patient)
  React.useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setDirectoryResults([]);
      setIsSearchingDirectory(false);
      return;
    }

    setIsSearchingDirectory(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/crm/patients?query=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = await res.json();
        const pts = (data.patients || []) as SelectedPatient[];
        // Filter out patients that already appear in today's active queue
        const queuePatientIds = new Set(queue.map((item) => item.patientId));
        setDirectoryResults(pts.filter((p) => !queuePatientIds.has(p.id)));
      } catch (err) {
        console.error("Directory search error:", err);
      } finally {
        setIsSearchingDirectory(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, queue]);

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
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[9px] font-mono py-0 h-4 bg-blue-50 text-[#2563EB] border-blue-200">
                {selectedPatient.uhid}
              </Badge>
              <button
                type="button"
                onClick={() => onSelectPatient("", undefined)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                title="Deselect patient"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
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
          <div className="py-2 text-center text-slate-400 text-xs">
            <p className="italic mb-2">Select a patient from today&apos;s queue or clinic directory below.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRegisterOpen(true)}
              className="h-6 text-[11px] border-[#2563EB] text-[#2563EB] hover:bg-blue-50 gap-1 mx-auto cursor-pointer"
            >
              <UserPlus className="h-3 w-3" />
              + Quick Register Walk-in
            </Button>
          </div>
        )}
      </div>

      {/* 3. Searchable OPD Queue & Directory for Today */}
      <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient name, phone, UHID..."
            className="h-7 text-xs pl-7 bg-white"
          />
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
          {isSearchingDirectory && (
            <Loader2 className="h-3.5 w-3.5 text-[#2563EB] animate-spin absolute right-2 top-2" />
          )}
        </div>
      </div>

      {/* 4. Section Strip with Count & Register Action */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/60 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
        <span>Today&apos;s OPD Queue ({queue.length})</span>
        <button
          type="button"
          onClick={() => setIsRegisterOpen(true)}
          className="text-[#2563EB] hover:underline font-bold text-[10px] lowercase flex items-center gap-0.5 cursor-pointer"
        >
          <UserPlus className="h-3 w-3" />
          + new
        </button>
      </div>

      {/* 5. Patient Queue & Directory List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
        {/* Today's Queue Items */}
        {filteredQueue.map((item) => {
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
        })}

        {/* Async Directory Results (Walk-in Consultations without today's appointment) */}
        {directoryResults.length > 0 && (
          <div className="pt-2">
            <div className="px-2 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 rounded flex items-center justify-between mb-1">
              <span>Clinic Directory ({directoryResults.length})</span>
              <span className="text-slate-400 font-normal">Walk-in</span>
            </div>
            {directoryResults.map((patient) => {
              const isSelected = selectedPatient?.id === patient.id;
              return (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => onSelectPatient(patient.id, undefined)}
                  className={cn(
                    "w-full text-left p-2 rounded-md transition-colors flex items-start gap-2 cursor-pointer mb-0.5",
                    isSelected
                      ? "bg-blue-50/80 border border-[#2563EB]/40"
                      : "hover:bg-slate-50 border border-transparent"
                  )}
                >
                  <div className="h-6 w-6 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    <UserCheck className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 truncate">
                        {patient.fullName}
                      </span>
                      <span className="text-[9px] font-semibold text-[#2563EB] bg-blue-50 px-1 rounded">
                        Walk-in
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 truncate">
                      <span>{patient.uhid}</span>
                      <span>•</span>
                      <span>{patient.phone}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty States */}
        {filteredQueue.length === 0 && directoryResults.length === 0 && (
          <div className="py-8 px-3 text-center space-y-2.5">
            <div className="h-8 w-8 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
              <Users className="h-4 w-4" />
            </div>
            {searchQuery.trim().length >= 2 ? (
              <>
                <p className="text-slate-500 text-xs">
                  No patient found matching &quot;{searchQuery}&quot;.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsRegisterOpen(true)}
                  className="h-7 text-xs bg-[#2563EB] hover:bg-blue-700 text-white gap-1 mx-auto cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Register &quot;{searchQuery}&quot;
                </Button>
              </>
            ) : (
              <>
                <p className="text-slate-400 text-xs">
                  {searchQuery ? "No matching patients in queue." : "No appointments for today."}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsRegisterOpen(true)}
                  className="h-7 text-xs border-[#2563EB] text-[#2563EB] hover:bg-blue-50 gap-1.5 mx-auto cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  + Register Walk-in Patient
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Embedded Quick Patient Registration Modal */}
      <QuickPatientRegistrationModal
        open={isRegisterOpen}
        onOpenChange={setIsRegisterOpen}
        onPatientCreated={(newPatient) => {
          onSelectPatient(newPatient.id, undefined);
        }}
      />
    </div>
  );
}
