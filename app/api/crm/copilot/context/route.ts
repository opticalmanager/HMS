import { NextResponse, type NextRequest } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { requireClinicSession, handleAuthError } from "@/lib/auth-guard";
import { appointments } from "@/db/schema/appointments";
import { patients } from "@/db/schema/patients";
import { doctors } from "@/db/schema/doctors";
import { clinicProfiles } from "@/db/schema/clinic-profiles";

export async function GET(request: NextRequest) {
  try {
    const { clinicId, user, role } = await requireClinicSession(
      { appointment: ["read"] },
      { headers: request.headers, redirectIfUnauthorized: false }
    );

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId") || undefined;
    const requestedDoctorId = searchParams.get("doctorId") || undefined;
    const appointmentId = searchParams.get("appointmentId") || undefined;

    // 1. Resolve clinic timezone and today's date
    const [profile] = await db
      .select({ timezone: clinicProfiles.timezone })
      .from(clinicProfiles)
      .where(eq(clinicProfiles.organizationId, clinicId))
      .limit(1);

    const timezone = profile?.timezone || "Asia/Kolkata";
    const todayDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    // 2. Resolve linked doctor for the current user (if user is doctor or staff)
    const [linkedDoc] = await db
      .select()
      .from(doctors)
      .where(and(eq(doctors.organizationId, clinicId), eq(doctors.userId, user.id)))
      .limit(1);

    const linkedDoctorId = linkedDoc?.id || null;
    const activeDoctorFilter = requestedDoctorId || linkedDoctorId || undefined;

    // 3. Today's OPD Queue
    const queueConditions = [
      eq(appointments.organizationId, clinicId),
      eq(appointments.appointmentDate, todayDateStr),
    ];
    if (activeDoctorFilter) {
      queueConditions.push(eq(appointments.doctorId, activeDoctorFilter));
    }

    const todayQueue = await db
      .select({
        id: appointments.id,
        tokenNumber: appointments.tokenNumber,
        status: appointments.status,
        timeSlot: appointments.timeSlot,
        priority: appointments.priority,
        chiefComplaints: appointments.chiefComplaints,
        patientId: appointments.patientId,
        patientName: patients.fullName,
        patientUhid: patients.uhid,
        patientPhone: patients.phone,
        patientAge: patients.age,
        patientGender: patients.gender,
        patientAllergies: patients.allergies,
        doctorId: appointments.doctorId,
        doctorName: doctors.fullName,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(and(...queueConditions))
      .orderBy(appointments.tokenNumber)
      .limit(50);

    // 4. Active Doctors List
    const activeDoctors = await db
      .select({
        id: doctors.id,
        fullName: doctors.fullName,
        specialty: doctors.specialty,
        consultationFee: doctors.consultationFee,
        phoneE164: doctors.phoneE164,
        userId: doctors.userId,
      })
      .from(doctors)
      .where(and(eq(doctors.organizationId, clinicId), eq(doctors.isActive, true)))
      .orderBy(doctors.fullName);

    // 5. Selected Patient (if provided or deduced from appointment)
    let targetPatientId = patientId;
    if (!targetPatientId && appointmentId) {
      const [appt] = await db
        .select({ patientId: appointments.patientId })
        .from(appointments)
        .where(and(eq(appointments.organizationId, clinicId), eq(appointments.id, appointmentId)))
        .limit(1);
      if (appt) targetPatientId = appt.patientId;
    }

    let selectedPatient = null;
    if (targetPatientId) {
      const [p] = await db
        .select()
        .from(patients)
        .where(and(eq(patients.organizationId, clinicId), eq(patients.id, targetPatientId)))
        .limit(1);
      selectedPatient = p || null;
    } else if (todayQueue.length > 0 && todayQueue[0].patientId) {
      // Default to first patient in queue if none explicitly selected
      const [p] = await db
        .select()
        .from(patients)
        .where(and(eq(patients.organizationId, clinicId), eq(patients.id, todayQueue[0].patientId)))
        .limit(1);
      selectedPatient = p || null;
    }

    // 6. Role Capabilities
    const capabilities = {
      canPrescribeDraft: role === "owner" || role === "admin" || role === "doctor",
      canApprovePrescription: role === "owner" || role === "doctor",
      canIssueInvoice: role === "owner" || role === "admin" || role === "receptionist",
      canBlockSlots: role === "owner" || role === "admin" || role === "doctor",
      isDoctorUser: role === "doctor",
      role,
    };

    return NextResponse.json({
      success: true,
      todayDateStr,
      timezone,
      linkedDoctorId,
      doctors: activeDoctors,
      todayQueue,
      selectedPatient,
      capabilities,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
