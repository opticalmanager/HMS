/**
 * Clinical Dose Frequency Parser
 * Parses medical shorthand notations into structured frequency, duration, and quantity.
 *
 * Supported formats:
 * - "1-0-1 5d" -> Morning: 1, Afternoon: 0, Night: 1, 5 days -> 10 tabs
 * - "1-1-1 3d" -> Morning: 1, Afternoon: 1, Night: 1, 3 days -> 9 tabs
 * - "1-0-0 30d" -> Morning: 1, Afternoon: 0, Night: 0, 30 days -> 30 tabs
 * - "0-0-1 10d" -> Morning: 0, Afternoon: 0, Night: 1, 10 days -> 10 tabs
 * - "1-1-1-1 7d" -> 4 times daily, 7 days -> 28 tabs
 * - "TDS 5d" / "TID 5d" -> 3 times daily, 5 days -> 15 tabs
 * - "BD 7d" / "BID 7d" -> 2 times daily, 7 days -> 14 tabs
 * - "OD 10d" -> 1 time daily, 10 days -> 10 tabs
 * - "QID 3d" -> 4 times daily, 3 days -> 12 tabs
 * - "SOS" / "PRN" -> As needed, default 5 days -> 5 tabs
 */

export interface ParsedDoseFrequency {
  frequency: string;
  morning: number;
  afternoon: number;
  night: number;
  dailyDoses: number;
  durationDays: number;
  totalQuantity: number;
  timingDescription: string;
}

export function parseDoseFrequency(
  input: string,
  fallbackDays: number = 5
): ParsedDoseFrequency {
  if (!input || !input.trim()) {
    return {
      frequency: "1-0-1",
      morning: 1,
      afternoon: 0,
      night: 1,
      dailyDoses: 2,
      durationDays: fallbackDays,
      totalQuantity: 2 * fallbackDays,
      timingDescription: "Twice daily (Morning & Night)",
    };
  }

  const raw = input.trim().toUpperCase();

  // Extract duration if present (e.g., "5d", "5 days", "for 5 days", "/ 5d")
  let durationDays = fallbackDays;
  const durationMatch = raw.match(/(\d+)\s*(D|DAYS|DAY)\b/i);
  if (durationMatch) {
    durationDays = parseInt(durationMatch[1], 10) || fallbackDays;
  }

  // Remove the duration portion to isolate the frequency code
  const freqPart = raw
    .replace(/(\d+)\s*(D|DAYS|DAY)\b/i, "")
    .replace(/[,\/]/g, " ")
    .trim();

  // Pattern 1: Hyphenated pattern "1-0-1", "1-1-1", "0.5-0-0.5", "1-1-1-1"
  const hyphenMatch = freqPart.match(/^([\d.]+)-([\d.]+)-([\d.]+)(?:-([\d.]+))?$/);
  if (hyphenMatch) {
    const morning = parseFloat(hyphenMatch[1]) || 0;
    const afternoon = parseFloat(hyphenMatch[2]) || 0;
    const night = parseFloat(hyphenMatch[3]) || 0;
    const extra = hyphenMatch[4] ? parseFloat(hyphenMatch[4]) || 0 : 0;
    const dailyDoses = morning + afternoon + night + extra;
    const totalQuantity = Math.ceil(dailyDoses * durationDays);

    let timingDescription = "Custom dosing";
    if (morning > 0 && afternoon === 0 && night > 0 && extra === 0) {
      timingDescription = "Twice daily (Morning & Night)";
    } else if (morning > 0 && afternoon > 0 && night > 0 && extra === 0) {
      timingDescription = "Thrice daily (Morning, Noon & Night)";
    } else if (morning > 0 && afternoon === 0 && night === 0 && extra === 0) {
      timingDescription = "Once daily in the morning";
    } else if (morning === 0 && afternoon === 0 && night > 0 && extra === 0) {
      timingDescription = "Once daily at bedtime";
    }

    return {
      frequency: hyphenMatch[0],
      morning,
      afternoon,
      night,
      dailyDoses,
      durationDays,
      totalQuantity,
      timingDescription,
    };
  }

  // Pattern 2: Latin medical acronyms
  if (freqPart.includes("TDS") || freqPart.includes("TID")) {
    return {
      frequency: "1-1-1",
      morning: 1,
      afternoon: 1,
      night: 1,
      dailyDoses: 3,
      durationDays,
      totalQuantity: 3 * durationDays,
      timingDescription: "Thrice daily (TDS / Morning, Noon, Night)",
    };
  }

  if (freqPart.includes("BD") || freqPart.includes("BID")) {
    return {
      frequency: "1-0-1",
      morning: 1,
      afternoon: 0,
      night: 1,
      dailyDoses: 2,
      durationDays,
      totalQuantity: 2 * durationDays,
      timingDescription: "Twice daily (BD / Morning & Night)",
    };
  }

  if (freqPart.includes("OD")) {
    return {
      frequency: "1-0-0",
      morning: 1,
      afternoon: 0,
      night: 0,
      dailyDoses: 1,
      durationDays,
      totalQuantity: 1 * durationDays,
      timingDescription: "Once daily (OD / Morning)",
    };
  }

  if (freqPart.includes("HS") || freqPart.includes("QHS")) {
    return {
      frequency: "0-0-1",
      morning: 0,
      afternoon: 0,
      night: 1,
      dailyDoses: 1,
      durationDays,
      totalQuantity: 1 * durationDays,
      timingDescription: "Once daily at bedtime (HS)",
    };
  }

  if (freqPart.includes("QID")) {
    return {
      frequency: "1-1-1-1",
      morning: 1,
      afternoon: 1,
      night: 1,
      dailyDoses: 4,
      durationDays,
      totalQuantity: 4 * durationDays,
      timingDescription: "Four times daily (QID)",
    };
  }

  if (freqPart.includes("SOS") || freqPart.includes("PRN")) {
    return {
      frequency: "SOS",
      morning: 0,
      afternoon: 0,
      night: 0,
      dailyDoses: 1,
      durationDays,
      totalQuantity: Math.max(5, durationDays),
      timingDescription: "As needed / when required (SOS)",
    };
  }

  // Fallback default
  return {
    frequency: freqPart || "1-0-1",
    morning: 1,
    afternoon: 0,
    night: 1,
    dailyDoses: 2,
    durationDays,
    totalQuantity: 2 * durationDays,
    timingDescription: "Twice daily",
  };
}
