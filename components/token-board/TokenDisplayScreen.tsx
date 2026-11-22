"use client";

import * as React from "react";
import { Volume2, VolumeX, Building2, Clock, Users, BellRing, Play, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { audioChime } from "@/utils/audio-chime";
import { useClinicalStore, clinicalStore } from "@/services/clinical-store";

interface CabinToken {
  room: string;
  doctor: string;
  department: string;
  token: number;
  patientName: string;
  status: "calling" | "in_room";
}

export function TokenDisplayScreen() {
  const store = useClinicalStore();
  const [currentTime, setCurrentTime] = React.useState("");
  const [isMuted, setIsMuted] = React.useState(false);
  const [lastChimedToken, setLastChimedToken] = React.useState<number | null>(null);

  // Compute active cabins dynamically from store
  const dynamicCabins: CabinToken[] = React.useMemo(() => {
    const active = store.appointments.filter(
      (a) => a.status === "in_consultation" || a.status === "arrived"
    );
    return active.map((a, idx) => ({
      room: `OPD Room ${idx + 1}`,
      doctor: a.doctorName || "Consultant",
      department: a.department || "General OPD",
      token: a.tokenNumber,
      patientName: a.patientName || "Patient",
      status: a.status === "arrived" ? ("calling" as const) : ("in_room" as const),
    }));
  }, [store.appointments]);

  // Upcoming queue tokens from store
  const upcomingTokens = store.appointments
    .filter((a) => a.status === "scheduled")
    .map((a) => a.tokenNumber);

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTestChime = () => {
    audioChime.playChime(0.6);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioChime.setMuted(nextMuted);
  };

  // Call token for a specific cabin with audio chime & store synchronization
  const handleCallToken = (cabinIdx: number) => {
    const targetCabin = dynamicCabins[cabinIdx];
    // Find next waiting appointment for this doctor/cabin or next general waiting
    const nextWaiting =
      store.appointments.find(
        (a) =>
          (a.status === "scheduled" || a.status === "arrived") &&
          (targetCabin ? a.doctorName === targetCabin.doctor || a.department === targetCabin.department : true)
      ) || store.appointments.find((a) => a.status === "scheduled" || a.status === "arrived");

    if (nextWaiting) {
      // Transition waiting appointment to in_consultation
      clinicalStore.updateAppointmentStatus(nextWaiting.id, "in_consultation");
      setLastChimedToken(nextWaiting.tokenNumber);
    }

    audioChime.playChime(0.7);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none">
      {/* High-Contrast TV Display Header */}
      <header className="h-20 bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#2563EB] flex items-center justify-center font-black text-2xl shadow-lg">
            +
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              {store.settings.hospitalName}
            </h1>
            <p className="text-xs text-blue-400 font-medium">Outpatient Department (OPD) Waiting Lounge Triage Screen</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Audio Chime Controls */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggleMute}
              className="h-7 text-xs gap-1.5 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
              {isMuted ? "Audio Muted" : "Audio Chime ON"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleTestChime}
              className="h-7 text-xs gap-1 bg-[#2563EB] hover:bg-blue-700 font-semibold"
            >
              <BellRing className="h-3 w-3" /> Test Chime
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
            <Clock className="h-5 w-5 text-blue-400" />
            <span className="font-mono text-xl font-black text-white tracking-wider">
              {currentTime || "10:30:00 AM"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Calling Cabin Grid */}
      <main className="flex-1 p-8">
        {dynamicCabins.length === 0 ? (
          <div className="h-full min-h-[380px] flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40">
            <Users className="h-16 w-16 text-slate-600 mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-slate-300">Queue Idle / Waiting for Next Patient</h2>
            <p className="text-sm text-slate-500 max-w-md mt-2">
              All consultations are currently cleared or waiting for patients to arrive. Newly checked-in tokens will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dynamicCabins.map((item, idx) => {
              const isCalling = item.status === "calling";
              return (
                <div
                  key={`${item.room}-${item.token}`}
                  className={`rounded-2xl border-2 p-6 flex flex-col justify-between transition-all relative ${
                    isCalling
                      ? "border-[#2563EB] bg-blue-950/40 shadow-2xl shadow-blue-500/20 ring-2 ring-blue-500/30"
                      : "border-slate-800 bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700">
                      {item.room}
                    </span>

                    <div className="flex items-center gap-2">
                      {isCalling && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                          <Volume2 className="h-4 w-4 animate-bounce" /> Now Calling
                        </span>
                      )}
                      {/* Doctor Desk Recall Trigger */}
                      <button
                        type="button"
                        onClick={() => handleCallToken(idx)}
                        title="Advance to next token"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1"
                      >
                        <Play className="h-3.5 w-3.5" /> Next Token
                      </button>
                    </div>
                  </div>

                  {/* Big Token Number for TV Legibility */}
                  <div className="my-6 text-center">
                    <div className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-1">
                      Token Number
                    </div>
                    <div className="text-8xl font-black font-mono tracking-tighter text-white drop-shadow-md">
                      #{item.token}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-white">{item.doctor}</div>
                      <div className="text-xs text-blue-400 font-semibold">{item.department}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-medium">Patient</div>
                      <div className="text-sm font-bold text-slate-200">{item.patientName}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Next Waiting Ticker */}
      <footer className="h-16 bg-slate-900 border-t border-slate-800 px-8 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4 text-slate-400" />
          <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">Next in Waiting Queue:</span>
          <div className="flex items-center gap-2 font-mono font-bold text-blue-400 text-sm">
            {upcomingTokens.length > 0 ? (
              upcomingTokens.slice(0, 8).map((t, i) => (
                <React.Fragment key={t}>
                  <span className="bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">#{t}</span>
                  {i < Math.min(7, upcomingTokens.length - 1) && <span className="text-slate-600">•</span>}
                </React.Fragment>
              ))
            ) : (
              <span className="text-slate-500 font-sans font-normal text-xs">Queue Idle / Waiting for Next Patient</span>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Please proceed to the designated OPD consulting room when your token number appears above.
        </div>
      </footer>
    </div>
  );
}
