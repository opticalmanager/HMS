"use client";

import { BedDouble, User, AlertCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyINR } from "@/utils/formatting";
import type { Bed, BedStatus } from "@/types/hms";

interface BedGridVisualizerProps {
  beds: Bed[];
  onSelectBed?: (bed: Bed) => void;
}

export function BedGridVisualizer({ beds, onSelectBed }: BedGridVisualizerProps) {
  const getStatusColor = (status: BedStatus) => {
    switch (status) {
      case "available":
        return "border-emerald-300 bg-emerald-50/50 hover:border-emerald-500 text-emerald-900";
      case "occupied":
        return "border-rose-300 bg-rose-50/50 hover:border-rose-500 text-rose-900";
      case "cleaning":
        return "border-amber-300 bg-amber-50/50 hover:border-amber-500 text-amber-900";
      case "maintenance":
        return "border-slate-300 bg-slate-100 hover:border-slate-400 text-slate-700";
      default:
        return "border-slate-200 bg-white";
    }
  };

  const getStatusBadge = (status: BedStatus) => {
    switch (status) {
      case "available":
        return <Badge variant="success">Available</Badge>;
      case "occupied":
        return <Badge variant="danger">Occupied</Badge>;
      case "cleaning":
        return <Badge variant="warning">Cleaning</Badge>;
      case "maintenance":
        return <Badge variant="outline">Maintenance</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {beds.map((bed) => {
        const isOccupied = bed.status === "occupied";
        return (
          <button
            key={bed.id}
            type="button"
            onClick={() => onSelectBed && onSelectBed(bed)}
            className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between h-36 ${getStatusColor(
              bed.status
            )}`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono font-bold text-sm text-slate-900">{bed.bedNumber}</span>
                {getStatusBadge(bed.status)}
              </div>
              <div className="text-[11px] font-medium text-slate-600 line-clamp-1">
                {bed.wardName}
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-200/60">
              {isOccupied ? (
                <div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <User className="h-3 w-3" /> Patient
                  </div>
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {bed.patientName || "Admitted"}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 font-medium">
                  {formatCurrencyINR(bed.dailyRate)} <span className="text-[9px]">/ day</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
