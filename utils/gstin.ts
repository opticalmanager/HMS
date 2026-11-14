/**
 * Indian Goods and Services Tax (GST / GSTIN) Utility for Hospital Billing & Pharmacy
 */

export const INDIAN_STATE_GST_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "36": "Telangana",
  "37": "Andhra Pradesh",
};

/**
 * Standard Indian GSTIN Regex
 * Format: 2 digits (State Code) + 5 letters (PAN) + 4 digits (PAN) + 1 letter (PAN) + 1 char (Entity) + 'Z' + 1 checksum char
 */
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGstin(gstin: string | undefined | null): boolean {
  if (!gstin) return false;
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) return false;
  const stateCode = clean.slice(0, 2);
  if (!INDIAN_STATE_GST_CODES[stateCode]) return false;
  return GSTIN_REGEX.test(clean);
}

export function getStateFromGstin(gstin: string): string | null {
  if (!validateGstin(gstin)) return null;
  const stateCode = gstin.slice(0, 2);
  return INDIAN_STATE_GST_CODES[stateCode] || null;
}

export interface GstBreakdown {
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalWithTax: number;
  totalAmount: number;
  isInterState: boolean;
}

export function calculateGstBreakdown(
  taxableAmount: number,
  gstRate: number, // 0, 5, 12, 18, 28
  hospitalStateCode: string = "27", // e.g. Maharashtra
  patientStateCode: string = "27"
): GstBreakdown {
  const isInterState = hospitalStateCode !== patientStateCode;
  const taxFactor = gstRate / 100;
  const totalTax = Number((taxableAmount * taxFactor).toFixed(2));
  const totalWithTax = Number((taxableAmount + totalTax).toFixed(2));

  if (isInterState) {
    return {
      taxableAmount,
      gstRate,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: gstRate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: totalTax,
      totalTax,
      totalWithTax,
      totalAmount: totalWithTax,
      isInterState: true,
    };
  }

  const halfRate = gstRate / 2;
  const halfTax = Number((totalTax / 2).toFixed(2));

  return {
    taxableAmount,
    gstRate,
    cgstRate: halfRate,
    sgstRate: halfRate,
    igstRate: 0,
    cgstAmount: halfTax,
    sgstAmount: halfTax,
    igstAmount: 0,
    totalTax,
    totalWithTax,
    totalAmount: totalWithTax,
    isInterState: false,
  };
}
