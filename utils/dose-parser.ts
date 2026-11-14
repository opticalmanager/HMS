/**
 * Clinical Dose Frequency Parser
 * Parses medical shorthand notations into structured frequency, duration, and quantity.
 *
 * Supported formats:
 * - "1-0-1 5d", "1-0-1 for 5 days", "1-0-1 x 5d", "1 - 0 - 1 5d" -> Morning: 1, Afternoon: 0, Night: 1, 5 days -> 10 tabs
 * - "1-1-1 3d" -> Morning: 1, Afternoon: 1, Night: 1, 3 days -> 9 tabs
 * - "1-0-0 30d", "1-0-0 1 month" -> Morning: 1, Afternoon: 0, Night: 0, 30 days -> 30 tabs
 * - "0-0-1 10d" -> Morning: 0, Afternoon: 0, Night: 1, 10 days -> 10 tabs
 * - "1-1-1-1 7d", "1-1-1-1 1 week" -> 4 times daily, 7 days -> 28 tabs
 * - "0.5-0-0.5 5d" -> 1 daily dose, 5 days -> 5 tabs
 * - "TDS 5d" / "TID 5d" -> 3 times daily, 5 days -> 15 tabs
 * - "BD 7d" / "BID 7d" / "BD 1 week" -> 2 times daily, 7 days -> 14 tabs
 * - "OD 10d" -> 1 time daily, 10 days -> 10 tabs
 * - "QID 3d" -> 4 times daily, 3 days -> 12 tabs
 * - "SOS" / "PRN" -> As needed, default 5 days -> 5 tabs
 * - "STAT" -> Single immediate dose -> 1 tab
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

  let raw = input.trim().toUpperCase();

  // Extract duration if present:
  // e.g. "5d", "5 days", "for 5 days", "x 5d", "2 weeks", "2w", "1 month", "1m"
  let durationDays = fallbackDays;

  // Month check: "1 month", "2 months", "1m"
  const monthMatch = raw.match(/(\d+)\s*(?:M|MONTHS|MONTH)\b/i);
  // Week check: "1 week", "2 weeks", "1w", "2w"
  const weekMatch = raw.match(/(\d+)\s*(?:W|WEEKS|WEEK)\b/i);
  // Day check: "5d", "5 days", "5 day"
  const dayMatch = raw.match(/(\d+)\s*(?:D|DAYS|DAY)\b/i);

  if (monthMatch) {
    durationDays = (parseInt(monthMatch[1], 10) || 1) * 30;
    raw = raw.replace(monthMatch[0], " ");
  } else if (weekMatch) {
    durationDays = (parseInt(weekMatch[1], 10) || 1) * 7;
    raw = raw.replace(weekMatch[0], " ");
  } else if (dayMatch) {
    durationDays = parseInt(dayMatch[1], 10) || fallbackDays;
    raw = raw.replace(dayMatch[0], " ");
  }

  // Remove common doctor filler words: "FOR", "X", "TIMES", "TAB", "TABS", "TABLET", "CAP", "CAPSULE", "/", ","
  const cleanFreq = raw
    .replace(/\b(FOR|X|TIMES|TAB|TABS|TABLETS|CAP|CAPS|CAPSULES|DAILY|PER\s+DAY)\b/gi, " ")
    .replace(/[,\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Pattern 1: Hyphenated pattern "1-0-1", "1-1-1", "0.5-0-0.5", "1-1-1-1", allowing spaces around hyphens
  const hyphenMatch = cleanFreq.match(/([\d.]+)\s*-\s*([\d.]+)\s*-\s*([\d.]+)(?:\s*-\s*([\d.]+))?/);
  if (hyphenMatch) {
    const morning = parseFloat(hyphenMatch[1]) || 0;
    const afternoon = parseFloat(hyphenMatch[2]) || 0;
    const night = parseFloat(hyphenMatch[3]) || 0;
    const extra = hyphenMatch[4] ? parseFloat(hyphenMatch[4]) || 0 : 0;
    const dailyDoses = morning + afternoon + night + extra;
    const totalQuantity = Math.max(1, Math.ceil(dailyDoses * durationDays));

    let standardFreq = `${morning}-${afternoon}-${night}`;
    if (extra > 0) standardFreq += `-${extra}`;

    let timingDescription = "Custom dosing schedule";
    if (morning > 0 && afternoon === 0 && night > 0 && extra === 0) {
      timingDescription = "Twice daily (Morning & Night)";
    } else if (morning > 0 && afternoon > 0 && night > 0 && extra === 0) {
      timingDescription = "Thrice daily (Morning, Noon & Night)";
    } else if (morning > 0 && afternoon === 0 && night === 0 && extra === 0) {
      timingDescription = "Once daily in the morning";
    } else if (morning === 0 && afternoon === 0 && night > 0 && extra === 0) {
      timingDescription = "Once daily at bedtime";
    } else if (morning === 0 && afternoon > 0 && night === 0 && extra === 0) {
      timingDescription = "Once daily in the afternoon";
    } else if (morning > 0 && afternoon > 0 && night > 0 && extra > 0) {
      timingDescription = "Four times daily";
    }

    return {
      frequency: standardFreq,
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
  if (/\b(TDS|TID)\b/i.test(cleanFreq)) {
    return {
      frequency: "1-1-1",
      morning: 1,
      afternoon: 1,
      night: 1,
      dailyDoses: 3,
      durationDays,
      totalQuantity: Math.max(1, 3 * durationDays),
      timingDescription: "Thrice daily (TDS / Morning, Noon, Night)",
    };
  }

  if (/\b(BD|BID)\b/i.test(cleanFreq)) {
    return {
      frequency: "1-0-1",
      morning: 1,
      afternoon: 0,
      night: 1,
      dailyDoses: 2,
      durationDays,
      totalQuantity: Math.max(1, 2 * durationDays),
      timingDescription: "Twice daily (BD / Morning & Night)",
    };
  }

  if (/\bOD\b/i.test(cleanFreq)) {
    return {
      frequency: "1-0-0",
      morning: 1,
      afternoon: 0,
      night: 0,
      dailyDoses: 1,
      durationDays,
      totalQuantity: Math.max(1, 1 * durationDays),
      timingDescription: "Once daily (OD / Morning)",
    };
  }

  if (/\b(HS|QHS)\b/i.test(cleanFreq)) {
    return {
      frequency: "0-0-1",
      morning: 0,
      afternoon: 0,
      night: 1,
      dailyDoses: 1,
      durationDays,
      totalQuantity: Math.max(1, 1 * durationDays),
      timingDescription: "Once daily at bedtime (HS)",
    };
  }

  if (/\bQID\b/i.test(cleanFreq)) {
    return {
      frequency: "1-1-1-1",
      morning: 1,
      afternoon: 1,
      night: 1,
      dailyDoses: 4,
      durationDays,
      totalQuantity: Math.max(1, 4 * durationDays),
      timingDescription: "Four times daily (QID)",
    };
  }

  if (/\b(SOS|PRN)\b/i.test(cleanFreq)) {
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

  if (/\bSTAT\b/i.test(cleanFreq)) {
    return {
      frequency: "STAT",
      morning: 1,
      afternoon: 0,
      night: 0,
      dailyDoses: 1,
      durationDays: 1,
      totalQuantity: 1,
      timingDescription: "Immediately / Single dose (STAT)",
    };
  }

  // Fallback default
  return {
    frequency: cleanFreq || "1-0-1",
    morning: 1,
    afternoon: 0,
    night: 1,
    dailyDoses: 2,
    durationDays,
    totalQuantity: Math.max(1, 2 * durationDays),
    timingDescription: "Twice daily",
  };
}
