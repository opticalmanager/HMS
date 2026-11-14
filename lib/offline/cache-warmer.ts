import { offlineDb } from "./db";
import type { Patient } from "@/types/hms";

/**
 * Warms the local Dexie.js database with patient records for zero-latency offline searches.
 */
export async function warmPatientCache(patientsList: Patient[]): Promise<number> {
  if (!offlineDb || !patientsList || patientsList.length === 0) return 0;

  try {
    await offlineDb.patients.bulkPut(patientsList);
    return patientsList.length;
  } catch (err) {
    console.error("[cache-warmer] Failed to warm patient cache:", err);
    return 0;
  }
}

/**
 * Searches local IndexedDB for patients when offline
 */
export async function searchOfflinePatients(query: string): Promise<Patient[]> {
  if (!offlineDb || !query) return [];

  const clean = query.trim().toLowerCase();
  try {
    return await offlineDb.patients
      .filter((p) => {
        return (
          p.fullName.toLowerCase().includes(clean) ||
          p.uhid.toLowerCase().includes(clean) ||
          p.phone.includes(clean)
        );
      })
      .limit(20)
      .toArray();
  } catch (err) {
    console.error("[cache-warmer] Offline search failed:", err);
    return [];
  }
}

/**
 * Retrieves all pending offline consultation drafts waiting for cloud sync
 */
export async function getPendingOfflineConsultations() {
  if (!offlineDb) return [];
  return await offlineDb.consultationsQueue.where("syncStatus").equals("pending").toArray();
}
