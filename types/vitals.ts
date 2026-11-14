/**
 * Clinical Vitals Types and Range Evaluation
 */

export interface VitalsRange {
  min: number;
  max: number;
  criticalMin?: number;
  criticalMax?: number;
  unit: string;
}

export type VitalStatus = "normal" | "warning" | "critical";

export interface EvaluatedVital<T = number> {
  value: T;
  unit: string;
  status: VitalStatus;
  message?: string;
}

export const ADULT_VITALS_BENCHMARKS = {
  systolicBp: { min: 90, max: 120, criticalMin: 70, criticalMax: 180, unit: "mmHg" },
  diastolicBp: { min: 60, max: 80, criticalMin: 40, criticalMax: 110, unit: "mmHg" },
  pulseRate: { min: 60, max: 100, criticalMin: 45, criticalMax: 130, unit: "bpm" },
  temperature: { min: 97.0, max: 99.0, criticalMin: 95.0, criticalMax: 104.0, unit: "°F" },
  respiratoryRate: { min: 12, max: 20, criticalMin: 8, criticalMax: 30, unit: "breaths/min" },
  spo2: { min: 95, max: 100, criticalMin: 90, criticalMax: 100, unit: "%" },
  bloodSugarRandom: { min: 70, max: 140, criticalMin: 50, criticalMax: 300, unit: "mg/dL" },
};

export function evaluateVital(
  param: keyof typeof ADULT_VITALS_BENCHMARKS,
  val: number | undefined | null
): VitalStatus {
  if (val === undefined || val === null || isNaN(val)) return "normal";
  const benchmark = ADULT_VITALS_BENCHMARKS[param];
  if (!benchmark) return "normal";

  if (
    (benchmark.criticalMin !== undefined && val < benchmark.criticalMin) ||
    (benchmark.criticalMax !== undefined && val > benchmark.criticalMax)
  ) {
    return "critical";
  }

  if (val < benchmark.min || val > benchmark.max) {
    return "warning";
  }

  return "normal";
}

export function calculateBmi(weightKg: number, heightCm: number): { bmi: number; category: string } {
  if (!weightKg || !heightCm || heightCm <= 0) return { bmi: 0, category: "N/A" };
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

  let category = "Normal";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi >= 25 && bmi < 29.9) category = "Overweight";
  else if (bmi >= 30) category = "Obese";

  return { bmi, category };
}
