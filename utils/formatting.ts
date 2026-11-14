/**
 * Clinical and Financial Formatting Utilities
 */

/**
 * Formats a numeric amount in Indian Lakh / Crore numbering system (e.g. ₹ 1,45,200.00)
 */
export function formatCurrencyINR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats an Indian Mobile Number to standard display or WhatsApp E.164
 */
export function formatPhoneNumber(phone: string): { display: string; e164: string } {
  if (!phone) return { display: "", e164: "" };
  const digits = phone.replace(/\D/g, "");

  let normalized = digits;
  if (digits.length === 10) {
    normalized = `91${digits}`;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    normalized = digits;
  }

  const national = normalized.length >= 10 ? normalized.slice(-10) : normalized;
  const display =
    national.length === 10
      ? `+91 ${national.slice(0, 5)} ${national.slice(5)}`
      : phone;

  return { display, e164: normalized };
}

/**
 * Formats patient age with gender (e.g. "45 Y / Male" or "8 M / Female")
 */
export function formatPatientDemographics(
  age?: number,
  gender?: string,
  dob?: string
): string {
  let displayAge = "";

  if (age !== undefined && age !== null) {
    displayAge = `${age} Y`;
  } else if (dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    displayAge = `${calculatedAge} Y`;
  } else {
    displayAge = "Age N/A";
  }

  const displayGender = gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : "";
  return displayGender ? `${displayAge} / ${displayGender}` : displayAge;
}

/**
 * Formats date to Indian clinical standard: DD-MMM-YYYY (e.g. 14-Nov-2026)
 */
export function formatClinicalDate(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return "N/A";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return "N/A";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}
