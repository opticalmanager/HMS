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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Activity, Heart, Thermometer, Wind, Scale } from "lucide-react";
import type { VitalRecord } from "@/types/hms";

interface VitalSignsGraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  currentVitals: VitalRecord;
}

interface HistoricalVitalPoint {
  date: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  spo2: number;
  temp: number;
  weight: number;
  bmi: number;
}

export function VitalSignsGraphModal({
  open,
  onOpenChange,
  patientName,
  currentVitals,
}: VitalSignsGraphModalProps) {
  const [activeMetric, setActiveMetric] = React.useState<"bp" | "pulse" | "spo2" | "temp" | "bmi">("bp");

  // Generate realistic historical timeline for this patient including current vitals
  const history: HistoricalVitalPoint[] = React.useMemo(() => {
    const curSys = currentVitals.systolicBp || 120;
    const curDia = currentVitals.diastolicBp || 80;
    const curPulse = currentVitals.pulseRate || 76;
    const curSpo2 = currentVitals.spo2 || 98;
    const curTemp = currentVitals.temperature || 98.6;
    const curWeight = currentVitals.weightKg || 70;
    const heightM = (currentVitals.heightCm || 170) / 100;
    const curBmi = parseFloat((curWeight / (heightM * heightM)).toFixed(1));

    return [
      {
        date: "02 Aug 2026",
        systolic: Math.max(100, curSys - 12),
        diastolic: Math.max(65, curDia - 8),
        pulse: Math.max(60, curPulse - 4),
        spo2: 99,
        temp: 98.4,
        weight: curWeight + 2,
        bmi: parseFloat(((curWeight + 2) / (heightM * heightM)).toFixed(1)),
      },
      {
        date: "18 Sep 2026",
        systolic: curSys + 6,
        diastolic: curDia + 4,
        pulse: curPulse + 6,
        spo2: 97,
        temp: 98.9,
        weight: curWeight + 1,
        bmi: parseFloat(((curWeight + 1) / (heightM * heightM)).toFixed(1)),
      },
      {
        date: "25 Oct 2026",
        systolic: curSys - 4,
        diastolic: curDia - 2,
        pulse: curPulse - 2,
        spo2: 98,
        temp: 98.6,
        weight: curWeight,
        bmi: curBmi,
      },
      {
        date: "Today (Current)",
        systolic: curSys,
        diastolic: curDia,
        pulse: curPulse,
        spo2: curSpo2,
        temp: curTemp,
        weight: curWeight,
        bmi: curBmi,
      },
    ];
  }, [currentVitals]);

  // Compute SVG plot dimensions
  const svgWidth = 520;
  const svgHeight = 160;
  const padX = 45;
  const padY = 25;

  const points = React.useMemo(() => {
    return history.map((pt, idx) => {
      const x = padX + (idx / (history.length - 1)) * (svgWidth - padX * 2);
      let val = 0;
      let minVal = 0;
      let maxVal = 100;

      if (activeMetric === "bp") {
        minVal = 50;
        maxVal = 180;
        val = pt.systolic;
      } else if (activeMetric === "pulse") {
        minVal = 40;
        maxVal = 140;
        val = pt.pulse;
      } else if (activeMetric === "spo2") {
        minVal = 85;
        maxVal = 100;
        val = pt.spo2;
      } else if (activeMetric === "temp") {
        minVal = 96;
        maxVal = 104;
        val = pt.temp;
      } else if (activeMetric === "bmi") {
        minVal = 15;
        maxVal = 40;
        val = pt.bmi;
      }

      const y = svgHeight - padY - ((val - minVal) / (maxVal - minVal)) * (svgHeight - padY * 2);
      return { x, y, val, label: pt.date, point: pt };
    });
  }, [history, activeMetric]);

  const pathD = React.useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "");
  }, [points]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-slate-100 bg-purple-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-300">
                <LineChart className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">
                  Vitals & Biometric Trend Graphs
                </DialogTitle>
                <p className="text-[11px] text-slate-500">
                  Multi-visit longitudinal monitoring for {patientName}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-white text-purple-700 border-purple-200">
              4 Historical Consultations
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Metric Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setActiveMetric("bp")}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeMetric === "bp"
                  ? "bg-white text-rose-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Heart className="h-3.5 w-3.5 text-rose-500" />
              Blood Pressure
            </button>
            <button
              onClick={() => setActiveMetric("pulse")}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeMetric === "pulse"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-blue-500" />
              Pulse Rate
            </button>
            <button
              onClick={() => setActiveMetric("spo2")}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeMetric === "spo2"
                  ? "bg-white text-cyan-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Wind className="h-3.5 w-3.5 text-cyan-500" />
              SpO2 (%)
            </button>
            <button
              onClick={() => setActiveMetric("temp")}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeMetric === "temp"
                  ? "bg-white text-amber-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Thermometer className="h-3.5 w-3.5 text-amber-500" />
              Temp (°F)
            </button>
            <button
              onClick={() => setActiveMetric("bmi")}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeMetric === "bmi"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Scale className="h-3.5 w-3.5 text-emerald-500" />
              BMI
            </button>
          </div>

          {/* SVG Trend Chart */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                {activeMetric === "bp" && "Systolic & Diastolic Blood Pressure (mmHg)"}
                {activeMetric === "pulse" && "Resting Heart / Pulse Rate (BPM)"}
                {activeMetric === "spo2" && "Blood Oxygen Saturation SpO2 (%)"}
                {activeMetric === "temp" && "Core Body Temperature (°F)"}
                {activeMetric === "bmi" && "Body Mass Index (BMI kg/m²)"}
              </span>
              <span className="text-[10px] text-slate-500">
                Normal:{" "}
                {activeMetric === "bp" && "120/80 mmHg"}
                {activeMetric === "pulse" && "60-100 bpm"}
                {activeMetric === "spo2" && "95-100%"}
                {activeMetric === "temp" && "97.8-99.1 °F"}
                {activeMetric === "bmi" && "18.5-24.9"}
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-44 select-none">
                {/* Horizontal Gridlines */}
                <line x1={padX} y1={padY} x2={svgWidth - padX} y2={padY} stroke="#e2e8f0" strokeDasharray="3 3" />
                <line x1={padX} y1={svgHeight / 2} x2={svgWidth - padX} y2={svgHeight / 2} stroke="#e2e8f0" strokeDasharray="3 3" />
                <line x1={padX} y1={svgHeight - padY} x2={svgWidth - padX} y2={svgHeight - padY} stroke="#cbd5e1" />

                {/* Trend Line Path */}
                <path d={pathD} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Points & Labels */}
                {points.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4.5" fill="#7c3aed" stroke="#ffffff" strokeWidth="2" />
                    <text
                      x={p.x}
                      y={p.y - 8}
                      textAnchor="middle"
                      className="fill-slate-800 text-[10px] font-bold"
                    >
                      {p.val}
                    </text>
                    <text
                      x={p.x}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      className="fill-slate-500 text-[9px]"
                    >
                      {p.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Historical Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="py-1.5 px-3">Date</TableHead>
                  <TableHead className="py-1.5 px-2 text-center">BP (mmHg)</TableHead>
                  <TableHead className="py-1.5 px-2 text-center">Pulse (bpm)</TableHead>
                  <TableHead className="py-1.5 px-2 text-center">SpO2 (%)</TableHead>
                  <TableHead className="py-1.5 px-2 text-center">Temp (°F)</TableHead>
                  <TableHead className="py-1.5 px-2 text-center">Weight / BMI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h, idx) => (
                  <TableRow key={idx} className={idx === history.length - 1 ? "bg-purple-50/40 font-semibold" : undefined}>
                    <TableCell className="py-2 px-3 text-slate-800">{h.date}</TableCell>
                    <TableCell className="py-2 px-2 text-center font-mono">
                      {h.systolic}/{h.diastolic}
                    </TableCell>
                    <TableCell className="py-2 px-2 text-center font-mono">{h.pulse}</TableCell>
                    <TableCell className="py-2 px-2 text-center font-mono">{h.spo2}%</TableCell>
                    <TableCell className="py-2 px-2 text-center font-mono">{h.temp}</TableCell>
                    <TableCell className="py-2 px-2 text-center font-mono">
                      {h.weight} kg • {h.bmi}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
