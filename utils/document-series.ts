/**
 * Document Series and Unique Identifier Sequence Generator
 * Produces structured sequential clinical & financial identifiers.
 */

export type DocumentType =
  | "UHID" // Universal Hospital ID: UHID-2026-000001
  | "OPD"  // OPD Consultation: OPD-2026-000001
  | "IPD"  // IPD Admission: IPD-2026-000001
  | "INV"  // Invoice: INV-2026-000001
  | "RX"   // Prescription: RX-2026-000001
  | "LAB"  // Lab Diagnostic: LAB-2026-000001
  | "GRN"  // Goods Receipt Note: GRN-2026-000001
  | "TKN"; // Token: TKN-001

export interface SequenceConfig {
  prefix: DocumentType;
  year?: number;
  padding?: number;
  branchCode?: string;
}

export function formatSequenceNumber(
  type: DocumentType,
  sequenceNumber: number,
  options: { year?: number; branchCode?: string; padding?: number } = {}
): string {
  const year = options.year || new Date().getFullYear();
  const padding = options.padding || (type === "TKN" ? 3 : 6);
  const paddedNum = String(sequenceNumber).padStart(padding, "0");

  if (type === "TKN") {
    return `TKN-${paddedNum}`;
  }

  if (options.branchCode) {
    return `${type}-${options.branchCode}-${year}-${paddedNum}`;
  }

  return `${type}-${year}-${paddedNum}`;
}

export function parseSequenceNumber(code: string): {
  type: string;
  prefix: string;
  year?: number;
  sequenceNumber: number;
  sequence: number;
  branchCode?: string;
} | null {
  if (!code) return null;
  const parts = code.split("-");
  if (parts.length < 2) return null;

  const type = parts[0];

  if (type === "TKN" && parts.length === 2) {
    const num = parseInt(parts[1], 10);
    return isNaN(num)
      ? null
      : { type, prefix: type, sequenceNumber: num, sequence: num };
  }

  const lastPart = parts[parts.length - 1];
  const seqNum = parseInt(lastPart, 10);
  if (isNaN(seqNum)) return null;

  let branchCode: string | undefined;
  let year: number | undefined;

  if (parts.length === 3) {
    const possibleYear = parseInt(parts[1], 10);
    if (!isNaN(possibleYear) && possibleYear > 1900 && possibleYear < 2100) {
      year = possibleYear;
    }
  } else if (parts.length >= 4) {
    branchCode = parts[1];
    const possibleYear = parseInt(parts[2], 10);
    if (!isNaN(possibleYear) && possibleYear > 1900 && possibleYear < 2100) {
      year = possibleYear;
    }
  }

  return { type, prefix: type, year, sequenceNumber: seqNum, sequence: seqNum, branchCode };
}
