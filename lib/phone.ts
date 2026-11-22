/**
 * E.164 Phone Number Normalization Utility
 *
 * Normalizes Indian mobile and general international phone numbers into E.164 format.
 * Defaults to Indian country code (+91).
 */

export function normalizePhoneE164(
  input: string | null | undefined,
  defaultCountryCode = "+91"
): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  // Strip all whitespace, hyphens, parentheses, and dots
  const cleaned = input.trim().replace(/[\s\-\(\)\.]/g, "");
  if (!cleaned) {
    return null;
  }

  // Ensure defaultCountryCode has leading '+'
  const normCC = defaultCountryCode.startsWith("+")
    ? defaultCountryCode
    : `+${defaultCountryCode}`;

  let digitsOnly = "";
  let hasPlus = cleaned.startsWith("+");

  if (hasPlus) {
    digitsOnly = cleaned.slice(1);
  } else {
    digitsOnly = cleaned;
  }

  // Must only contain numeric digits
  if (!/^\d+$/.test(digitsOnly)) {
    return null;
  }

  // Handle Indian Numbers (+91 or default)
  if (normCC === "+91") {
    // Case 1: Already has +91 prefix
    if (hasPlus && digitsOnly.startsWith("91")) {
      const national = digitsOnly.slice(2);
      if (isValidIndianMobileNational(national)) {
        return `+91${national}`;
      }
      return null;
    }

    // Case 2: Starts with 91 without plus and is 12 digits
    if (!hasPlus && digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      const national = digitsOnly.slice(2);
      if (isValidIndianMobileNational(national)) {
        return `+91${national}`;
      }
      return null;
    }

    // Case 3: Starts with single leading 0 (e.g. 09876543210 -> 11 digits)
    if (!hasPlus && digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
      const national = digitsOnly.slice(1);
      if (isValidIndianMobileNational(national)) {
        return `+91${national}`;
      }
      return null;
    }

    // Case 4: Standard 10-digit Indian mobile number
    if (!hasPlus && digitsOnly.length === 10) {
      if (isValidIndianMobileNational(digitsOnly)) {
        return `+91${digitsOnly}`;
      }
      return null;
    }

    // If hasPlus with other country code but normCC was +91
    if (hasPlus && digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return `+${digitsOnly}`;
    }

    return null;
  }

  // For other country codes
  if (hasPlus) {
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return `+${digitsOnly}`;
    }
    return null;
  }

  // Prepend default non-Indian country code
  const ccDigits = normCC.replace("+", "");
  if (digitsOnly.startsWith(ccDigits)) {
    return `+${digitsOnly}`;
  }

  const combined = `${ccDigits}${digitsOnly}`;
  if (combined.length >= 7 && combined.length <= 15) {
    return `+${combined}`;
  }

  return null;
}

/**
 * Validates a 10-digit Indian mobile national destination number.
 * Valid Indian mobile numbers start with 6, 7, 8, or 9 and cannot be all repetitive digits.
 */
function isValidIndianMobileNational(digits: string): boolean {
  if (digits.length !== 10) return false;
  if (!/^[6-9]\d{9}$/.test(digits)) return false;

  // Reject all identical digits (e.g. 9999999999, 8888888888)
  if (/^(\d)\1{9}$/.test(digits)) return false;

  return true;
}
