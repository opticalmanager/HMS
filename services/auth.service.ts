import { verifyOfflineSession, type OfflineSessionPayload } from "@/lib/offline-auth";
import type { UserRole } from "@/types/permissions";

export interface CurrentUserSession {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId: string;
  branchId?: string | null;
  isOffline: boolean;
}

export class AuthService {
  /**
   * Resolves the current user session from Supabase SSR or HMAC offline fallback cookie.
   */
  static resolveSessionFromCookies(cookiesObj: {
    supabaseToken?: string;
    offlineProfile?: string;
    offlineSig?: string;
  }): CurrentUserSession | null {
    // 1. Try offline HMAC session signature if present
    if (cookiesObj.offlineProfile && cookiesObj.offlineSig) {
      const verified = verifyOfflineSession(cookiesObj.offlineProfile, cookiesObj.offlineSig);
      if (verified) {
        return {
          id: verified.id,
          email: verified.email,
          fullName: verified.fullName,
          role: verified.role as UserRole,
          organizationId: verified.organizationId,
          branchId: verified.branchId,
          isOffline: true,
        };
      }
    }

    // Return null when unauthenticated
    return null;
  }
}
