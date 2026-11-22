import "dotenv/config";
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../lib/drizzle";
import {
  organizations,
  doctors,
  patients,
  appointments,
  medicineMaster,
  serviceTariffs,
  doctorSchedules,
} from "../db/schema";
import { normalizePhoneE164 } from "../lib/phone";
import { encryptBroadcastApiKey, decryptBroadcastApiKey } from "../lib/crypto";
import { fuzzyMatchMedicines, fuzzyMatchTariffs } from "../lib/fuzzy-search";
import {
  ac,
  ownerRole,
  adminRole,
  doctorRole,
  receptionistRole,
} from "../lib/auth-permissions";
import {
  requireClinicSession,
  ForbiddenError,
  UnauthorizedError,
} from "../lib/auth-guard";

describe("Step 2: Core Schema, Concurrency Locks & Master Data Test Suite", () => {
  // -------------------------------------------------------------
  // 1. Phone Normalization Utility Tests
  // -------------------------------------------------------------
  describe("Phone Normalization (lib/phone.ts)", () => {
    it("normalizes standard 10-digit Indian mobile numbers starting with 6-9", () => {
      assert.strictEqual(normalizePhoneE164("9876543210"), "+919876543210");
      assert.strictEqual(normalizePhoneE164("8123456789"), "+918123456789");
      assert.strictEqual(normalizePhoneE164("7000012345"), "+917000012345");
      assert.strictEqual(normalizePhoneE164("6234567890"), "+916234567890");
    });

    it("normalizes Indian mobile numbers with 0 STD prefix", () => {
      assert.strictEqual(normalizePhoneE164("09876543210"), "+919876543210");
    });

    it("normalizes Indian mobile numbers with +91 prefix and formatting characters", () => {
      assert.strictEqual(normalizePhoneE164("+91 98765-43210"), "+919876543210");
      assert.strictEqual(normalizePhoneE164("+91 (98765) 43210"), "+919876543210");
      assert.strictEqual(normalizePhoneE164("919876543210"), "+919876543210");
    });

    it("rejects invalid Indian mobile numbers", () => {
      // Starting with invalid digits 0-5
      assert.strictEqual(normalizePhoneE164("5555555555"), null);
      assert.strictEqual(normalizePhoneE164("1234567890"), null);
      // All repetitive identical digits
      assert.strictEqual(normalizePhoneE164("9999999999"), null);
      assert.strictEqual(normalizePhoneE164("8888888888"), null);
      // Too short or too long
      assert.strictEqual(normalizePhoneE164("987654321"), null);
      assert.strictEqual(normalizePhoneE164("987654321000"), null);
      // Non-numeric characters
      assert.strictEqual(normalizePhoneE164("98765abcde"), null);
      // Empty or null
      assert.strictEqual(normalizePhoneE164(""), null);
      assert.strictEqual(normalizePhoneE164(null), null);
    });

    it("supports international numbers with custom default country code", () => {
      assert.strictEqual(normalizePhoneE164("2125551234", "+1"), "+12125551234");
      assert.strictEqual(normalizePhoneE164("+447911123456"), "+447911123456");
    });
  });

  // -------------------------------------------------------------
  // 2. AES-256-GCM Crypto Tests
  // -------------------------------------------------------------
  describe("AES-256-GCM Encryption & Decryption (lib/crypto.ts)", () => {
    it("encrypts plaintext into iv:authTag:ciphertext format and decrypts back", () => {
      const plaintext = "EAABwzLIXnjYBA...meta_cloud_waba_secret_token_12345";
      const encrypted = encryptBroadcastApiKey(plaintext);

      assert.ok(typeof encrypted === "string");
      const parts = encrypted.split(":");
      assert.strictEqual(parts.length, 3, "Encrypted string must have iv, authTag, and ciphertext");
      assert.strictEqual(parts[0].length, 24, "IV hex length must be 24 chars (12 bytes)");
      assert.strictEqual(parts[1].length, 32, "AuthTag hex length must be 32 chars (16 bytes)");

      const decrypted = decryptBroadcastApiKey(encrypted);
      assert.strictEqual(decrypted, plaintext, "Decrypted text must match original plaintext");
    });

    it("rejects tampered ciphertext with an authentication tag mismatch", () => {
      const plaintext = "sensitive_api_secret_key";
      const encrypted = encryptBroadcastApiKey(plaintext);
      const parts = encrypted.split(":");

      // Tamper ciphertext
      const tamperedCipher = parts[2].slice(0, -2) + (parts[2].endsWith("0") ? "1" : "0");
      const tamperedString = `${parts[0]}:${parts[1]}:${tamperedCipher}`;

      assert.throws(() => {
        decryptBroadcastApiKey(tamperedString);
      }, /Unsupported state or unable to authenticate data|authentication tag mismatch/i);
    });

    it("throws on malformed format", () => {
      assert.throws(() => {
        decryptBroadcastApiKey("not-a-valid-encrypted-string");
      }, /Invalid encrypted format/);
    });
  });

  // -------------------------------------------------------------
  // 3. Database Concurrency Locks & Idempotency Tests
  // -------------------------------------------------------------
  describe("PostgreSQL Concurrency Locks & Idempotency Indexes", () => {
    let testOrgAId: string;
    let testOrgBId: string;
    let testDoctorId: string;
    let testPatientId: string;

    before(async () => {
      // Create isolated test organizations
      const [orgA] = await db
        .insert(organizations)
        .values({
          name: "Test Org Concurrency A",
          slug: `test-org-a-${Date.now()}`,
          isActive: true,
        })
        .returning();
      testOrgAId = orgA.id;

      const [orgB] = await db
        .insert(organizations)
        .values({
          name: "Test Org Tenant B",
          slug: `test-org-b-${Date.now()}`,
          isActive: true,
        })
        .returning();
      testOrgBId = orgB.id;

      // Create test doctor in Org A
      const [doc] = await db
        .insert(doctors)
        .values({
          organizationId: testOrgAId,
          fullName: "Dr. Concurrency Specialist",
          specialty: "General Surgery",
          consultationFee: "700.00",
          phoneE164: "+919800000001",
          isActive: true,
        })
        .returning();
      testDoctorId = doc.id;

      // Create test patient in Org A
      const [pat] = await db
        .insert(patients)
        .values({
          organizationId: testOrgAId,
          uhid: `UHID-TEST-${Date.now()}`,
          fullName: "Test Patient Concurrency",
          gender: "male",
          phone: "+919800000002",
          phoneE164: "+919800000002",
        })
        .returning();
      testPatientId = pat.id;
    });

    after(async () => {
      // Clean up test organizations (cascade deletes appointments, doctors, patients, catalog)
      if (testOrgAId) {
        await db.delete(organizations).where(eq(organizations.id, testOrgAId));
      }
      if (testOrgBId) {
        await db.delete(organizations).where(eq(organizations.id, testOrgBId));
      }
      if (globalThis.__hmsPostgresClient) {
        await globalThis.__hmsPostgresClient.end({ timeout: 2 });
      }
    });

    it("Concurrency Lock: 2 active appointments at same (org, doctor, slotStart) fail with Postgres 23505; inserting after cancellation succeeds", async () => {
      const slotStartTime = new Date("2026-12-05T10:00:00Z");
      const slotEndTime = new Date("2026-12-05T10:15:00Z");

      // Insert first appointment with status = 'scheduled'
      const [firstApt] = await db
        .insert(appointments)
        .values({
          organizationId: testOrgAId,
          patientId: testPatientId,
          doctorId: testDoctorId,
          department: "General Surgery",
          tokenNumber: 101,
          appointmentDate: "2026-12-05",
          timeSlot: "10:00",
          slotStart: slotStartTime,
          slotEnd: slotEndTime,
          status: "scheduled",
          source: "WEB",
        })
        .returning();

      assert.ok(firstApt.id, "First appointment successfully scheduled");

      // Attempt to schedule conflicting second appointment at the exact same slot
      let conflictError: any = null;
      try {
        await db.insert(appointments).values({
          organizationId: testOrgAId,
          patientId: testPatientId,
          doctorId: testDoctorId,
          department: "General Surgery",
          tokenNumber: 102,
          appointmentDate: "2026-12-05",
          timeSlot: "10:00",
          slotStart: slotStartTime,
          slotEnd: slotEndTime,
          status: "scheduled",
          source: "WHATSAPP",
        });
      } catch (err: any) {
        conflictError = err;
      }

      assert.ok(conflictError, "Conflicting appointment insert must be rejected");
      // Postgres error code 23505 = unique_violation
      assert.strictEqual(
        conflictError.code || conflictError.cause?.code,
        "23505",
        "Must violate partial unique index with code 23505"
      );

      // Now cancel the first appointment
      await db
        .update(appointments)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(appointments.id, firstApt.id));

      // Attempt scheduling at the same slot again now that first appointment is cancelled
      const [rebookedApt] = await db
        .insert(appointments)
        .values({
          organizationId: testOrgAId,
          patientId: testPatientId,
          doctorId: testDoctorId,
          department: "General Surgery",
          tokenNumber: 103,
          appointmentDate: "2026-12-05",
          timeSlot: "10:00",
          slotStart: slotStartTime,
          slotEnd: slotEndTime,
          status: "scheduled",
          source: "VOICE_DOGRAH",
        })
        .returning();

      assert.ok(rebookedApt.id, "Booking slot after cancellation must succeed cleanly");
    });

    it("Idempotency Lock: duplicate (org, idempotencyKey) is rejected with Postgres 23505", async () => {
      const idempotencyKey = `idem-test-key-${Date.now()}`;
      const slotTime = new Date("2026-12-06T11:00:00Z");

      // First call with idempotencyKey
      const [apt1] = await db
        .insert(appointments)
        .values({
          organizationId: testOrgAId,
          patientId: testPatientId,
          doctorId: testDoctorId,
          department: "General Surgery",
          tokenNumber: 201,
          appointmentDate: "2026-12-06",
          timeSlot: "11:00",
          slotStart: slotTime,
          status: "scheduled",
          idempotencyKey,
        })
        .returning();

      assert.ok(apt1.id);

      // Retry / duplicate write with the same idempotencyKey in the same organization
      let duplicateError: any = null;
      try {
        await db.insert(appointments).values({
          organizationId: testOrgAId,
          patientId: testPatientId,
          doctorId: testDoctorId,
          department: "General Surgery",
          tokenNumber: 202,
          appointmentDate: "2026-12-06",
          timeSlot: "11:15",
          slotStart: new Date("2026-12-06T11:15:00Z"),
          status: "scheduled",
          idempotencyKey,
        });
      } catch (err: any) {
        duplicateError = err;
      }

      assert.ok(duplicateError, "Duplicate idempotencyKey must be rejected");
      assert.strictEqual(
        duplicateError.code || duplicateError.cause?.code,
        "23505",
        "Duplicate idempotencyKey must throw 23505 unique violation"
      );
    });

    // -------------------------------------------------------------
    // 4. Tenant-Isolated pg_trgm Fuzzy Search Tests
    // -------------------------------------------------------------
    it("Tenant-Isolated pg_trgm Fuzzy Search: matches for orgA and 0 items for orgB", async () => {
      // Seed distinct medicine for Org A
      await db.insert(medicineMaster).values({
        organizationId: testOrgAId,
        brandName: "OrgA CardioFlow 100",
        genericName: "Enalapril Maleate",
        form: "TABLET",
        strength: "100mg",
        defaultDosage: "1 tab daily",
        defaultFrequency: "OD",
        defaultDurationDays: 30,
        isActive: true,
      });

      // Seed distinct medicine for Org B
      await db.insert(medicineMaster).values({
        organizationId: testOrgBId,
        brandName: "OrgB NeuroCalm 50",
        genericName: "Pregabalin",
        form: "CAPSULE",
        strength: "50mg",
        defaultDosage: "1 cap night",
        defaultFrequency: "OD",
        defaultDurationDays: 15,
        isActive: true,
      });

      // Search "CardioFlow" in Org A
      const matchOrgA = await fuzzyMatchMedicines(testOrgAId, "CardioFlow");
      assert.ok(matchOrgA.length >= 1, "Org A must find its CardioFlow medicine");
      assert.strictEqual(matchOrgA[0].brandName, "OrgA CardioFlow 100");
      assert.ok(matchOrgA[0].score >= 0.5, "High match score expected");
      assert.strictEqual(matchOrgA[0].needsReview, false, "High match needsReview must be false");

      // Search same "CardioFlow" query in Org B
      const matchOrgB = await fuzzyMatchMedicines(testOrgBId, "CardioFlow");
      assert.strictEqual(matchOrgB.length, 0, "Org B must return 0 items for Org A's medicine");
    });
  });

  // -------------------------------------------------------------
  // 5. RBAC Authorization & Permission Tests
  // -------------------------------------------------------------
  describe("Master Data & Schedule RBAC Access Control", () => {
    it("receptionist gets 403 when attempting to create/update service tariffs", () => {
      // Service tariff management requires billing: ['void']
      const check = receptionistRole.authorize({ billing: ["void"] });
      assert.strictEqual(
        check.success,
        false,
        "Receptionist must be denied billing: ['void'] authority for tariff management"
      );
    });

    it("owner and admin are authorized to manage service tariffs", () => {
      assert.strictEqual(ownerRole.authorize({ billing: ["void"] }).success, true);
      assert.strictEqual(adminRole.authorize({ billing: ["void"] }).success, true);
    });

    it("receptionist gets 403 when creating or modifying doctor schedules", () => {
      // Schedule management requires schedule: ['manage_own'] or ['manage_all']
      const checkOwn = receptionistRole.authorize({ schedule: ["manage_own"] });
      const checkAll = receptionistRole.authorize({ schedule: ["manage_all"] });
      assert.strictEqual(checkOwn.success, false, "Receptionist cannot manage_own schedules");
      assert.strictEqual(checkAll.success, false, "Receptionist cannot manage_all schedules");
    });

    it("doctor can manage own schedule but cannot manage_all schedules", () => {
      assert.strictEqual(doctorRole.authorize({ schedule: ["manage_own"] }).success, true);
      assert.strictEqual(doctorRole.authorize({ schedule: ["manage_all"] }).success, false);
    });

    it("owner and admin can manage all doctor schedules", () => {
      assert.strictEqual(ownerRole.authorize({ schedule: ["manage_all"] }).success, true);
      assert.strictEqual(adminRole.authorize({ schedule: ["manage_all"] }).success, true);
    });

    it("enforces requireClinicSession permission check on receptionist attempting tariff modification", async () => {
      // Simulated receptionist session
      const receptionistSession = {
        user: { id: "user-rec-1", email: "reception@apex.in", name: "Ritu Receptionist" },
        session: { id: "sess-rec-1", userId: "user-rec-1", activeOrganizationId: "org-1" },
      };

      await assert.rejects(
        async () => {
          await requireClinicSession(
            { billing: ["void"] },
            {
              session: receptionistSession,
              role: "receptionist",
              redirectIfUnauthorized: false,
            }
          );
        },
        (err: any) => {
          assert.strictEqual(err.name, "ForbiddenError");
          assert.strictEqual(err.status, 403);
          return true;
        }
      );
    });

    it("allows doctor to manage own schedule via requireClinicSession", async () => {
      const doctorSession = {
        user: { id: "user-doc-1", email: "doc@apex.in", name: "Dr. Gaurav" },
        session: { id: "sess-doc-1", userId: "user-doc-1", activeOrganizationId: "org-1" },
      };

      const result = await requireClinicSession(
        { schedule: ["manage_own"] },
        {
          session: doctorSession,
          role: "doctor",
          redirectIfUnauthorized: false,
        }
      );

      assert.strictEqual(result.role, "doctor");
      assert.strictEqual(result.clinicId, "org-1");
    });
  });
});
