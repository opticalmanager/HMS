"use client";

import * as React from "react";
import { Activity, Heart, Thermometer, Wind, Scale, Edit3, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { evaluateVital, calculateBmi } from "@/types/vitals";
import type { VitalRecord } from "@/types/hms";

interface VitalsCardProps {
  vitals?: VitalRecord;
  onUpdateVitals?: (updated: VitalRecord) => void;
  editable?: boolean;
}

export function VitalsCard({ vitals, onUpdateVitals, editable = true }: VitalsCardProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [formVitals, setFormVitals] = React.useState<VitalRecord>(
    vitals || {
      patientId: "pat-1",
      recordedAt: new Date().toISOString(),
      systolicBp: 138,
      diastolicBp: 88,
      pulseRate: 84,
      temperature: 98.6,
      spo2: 98,
      heightCm: 172,
      weightKg: 78,
    }
  );

  React.useEffect(() => {
    if (vitals) setFormVitals(vitals);
  }, [vitals]);

  const current = formVitals;
  const bmiInfo = calculateBmi(current.weightKg || 0, current.heightCm || 0);

  // Hypertensive Staging (AHA / Indian Guidelines)
  const getHypertensiveStage = (sys?: number, dia?: number) => {
    if (!sys || !dia) return { label: "Normal", variant: "success" as const };
    if (sys >= 160 || dia >= 100) return { label: "Stage 2 HTN", variant: "danger" as const };
    if (sys >= 140 || dia >= 90) return { label: "Stage 1 HTN", variant: "warning" as const };
    if (sys >= 120 || dia >= 80) return { label: "Pre-Hypertension", variant: "warning" as const };
    return { label: "Normotensive", variant: "success" as const };
  };

  const htStage = getHypertensiveStage(current.systolicBp, current.diastolicBp);
  const pulseStatus = current.pulseRate ? evaluateVital("pulseRate", current.pulseRate) : "normal";
  const spo2Status = current.spo2 ? evaluateVital("spo2", current.spo2) : "normal";
  const tempStatus = current.temperature ? evaluateVital("temperature", current.temperature) : "normal";

  const handleSave = () => {
    setIsEditing(false);
    if (onUpdateVitals) {
      onUpdateVitals({
        ...current,
        bmi: bmiInfo.bmi,
        recordedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Recorded Clinical Vitals
          </span>
          <Badge variant={htStage.variant} className="text-[10px]">
            {htStage.label}
          </Badge>
        </div>

        {editable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            className="h-6 text-[11px] gap-1 text-[#2563EB] hover:bg-blue-50"
          >
            {isEditing ? (
              <>
                <Check className="h-3 w-3" /> Save Vitals
              </>
            ) : (
              <>
                <Edit3 className="h-3 w-3" /> Edit Vitals
              </>
            )}
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          <div>
            <label className="text-[10px] font-medium text-slate-600 block mb-0.5">Systolic BP</label>
            <Input
              type="number"
              value={current.systolicBp || ""}
              onChange={(e) => setFormVitals({ ...current, systolicBp: parseInt(e.target.value, 10) || 0 })}
              className="h-8 text-xs bg-white"
              placeholder="120"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-600 block mb-0.5">Diastolic BP</label>
            <Input
              type="number"
              value={current.diastolicBp || ""}
              onChange={(e) => setFormVitals({ ...current, diastolicBp: parseInt(e.target.value, 10) || 0 })}
              className="h-8 text-xs bg-white"
              placeholder="80"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-600 block mb-0.5">Pulse (bpm)</label>
            <Input
              type="number"
              value={current.pulseRate || ""}
              onChange={(e) => setFormVitals({ ...current, pulseRate: parseInt(e.target.value, 10) || 0 })}
              className="h-8 text-xs bg-white"
              placeholder="72"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-600 block mb-0.5">SpO2 (%)</label>
            <Input
              type="number"
              value={current.spo2 || ""}
              onChange={(e) => setFormVitals({ ...current, spo2: parseInt(e.target.value, 10) || 0 })}
              className="h-8 text-xs bg-white"
              placeholder="98"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-600 block mb-0.5">Height (cm)</label>
            <Input
              type="number"
              value={current.heightCm || ""}
              onChange={(e) => setFormVitals({ ...current, heightCm: parseInt(e.target.value, 10) || 0 })}
              className="h-8 text-xs bg-white"
              placeholder="170"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-600 block mb-0.5">Weight (kg)</label>
            <Input
              type="number"
              value={current.weightKg || ""}
              onChange={(e) => setFormVitals({ ...current, weightKg: parseFloat(e.target.value) || 0 })}
              className="h-8 text-xs bg-white"
              placeholder="70"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Blood Pressure Card with Hypertensive Highlighting */}
          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium flex items-center gap-1">
                <Heart className="h-3.5 w-3.5 text-rose-500" /> BP
              </span>
              <Badge variant={htStage.variant} className="text-[9px] px-1.5 py-0">
                {htStage.label}
              </Badge>
            </div>
            <div className="text-base font-bold text-slate-900">
              {current.systolicBp && current.diastolicBp ? `${current.systolicBp}/${current.diastolicBp}` : "--/--"}
              <span className="text-[10px] font-normal text-slate-400 ml-1">mmHg</span>
            </div>
          </div>

          {/* Pulse */}
          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-blue-500" /> Pulse
              </span>
              <Badge variant={pulseStatus === "normal" ? "success" : "warning"} className="text-[9px] px-1.5 py-0">
                {pulseStatus}
              </Badge>
            </div>
            <div className="text-base font-bold text-slate-900">
              {current.pulseRate || "--"}
              <span className="text-[10px] font-normal text-slate-400 ml-1">bpm</span>
            </div>
          </div>

          {/* SpO2 */}
          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium flex items-center gap-1">
                <Wind className="h-3.5 w-3.5 text-cyan-500" /> SpO2
              </span>
              <Badge variant={spo2Status === "normal" ? "success" : "danger"} className="text-[9px] px-1.5 py-0">
                {current.spo2 ? `${current.spo2}%` : "--"}
              </Badge>
            </div>
            <div className="text-base font-bold text-slate-900">
              {current.spo2 ? `${current.spo2}%` : "--"}
            </div>
          </div>

          {/* Temp */}
          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5 text-amber-500" /> Temp
              </span>
              <Badge variant={tempStatus === "normal" ? "success" : "warning"} className="text-[9px] px-1.5 py-0">
                {tempStatus}
              </Badge>
            </div>
            <div className="text-base font-bold text-slate-900">
              {current.temperature ? `${current.temperature}°F` : "98.6°F"}
            </div>
          </div>

          {/* BMI */}
          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-medium flex items-center gap-1">
                <Scale className="h-3.5 w-3.5 text-emerald-500" /> Auto BMI
              </span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-50">
                {bmiInfo.category}
              </Badge>
            </div>
            <div className="text-base font-bold text-slate-900">
              {bmiInfo.bmi > 0 ? bmiInfo.bmi : "--"}
              <span className="text-[10px] font-normal text-slate-400 ml-1">kg/m²</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
