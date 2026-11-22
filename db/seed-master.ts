/**
 * Master Data & Seed Script for Apex HMS Clinic CRM
 *
 * Seeds:
 * 1. Default clinic_profiles
 * 2. 3 default outpatient doctors & schedules
 * 3. 25 realistic Indian outpatient medicines (medicine_master)
 * 4. 15 clinical service tariffs (service_tariffs)
 *
 * Usage:
 *   npx tsx db/seed-master.ts [--org <organizationId>]
 */

import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { db } from "../lib/drizzle";
import {
  organizations,
  clinicProfiles,
  doctors,
  doctorSchedules,
  medicineMaster,
  serviceTariffs,
  type MedicineMasterEntity,
  type ServiceTariffEntity,
} from "./schema";

const INDIAN_MEDICINES: Array<{
  brandName: string;
  genericName: string;
  strength: string;
  form: MedicineMasterEntity["form"];
  defaultDosage: string;
  defaultFrequency: MedicineMasterEntity["defaultFrequency"];
  defaultDurationDays: number;
}> = [
  { brandName: "Augmentin 625 Duo", genericName: "Amoxicillin + Potassium Clavulanate", strength: "500mg/125mg", form: "TABLET", defaultDosage: "1 tablet after meals", defaultFrequency: "BD", defaultDurationDays: 5 },
  { brandName: "Dolo 650", genericName: "Paracetamol", strength: "650mg", form: "TABLET", defaultDosage: "1 tablet for fever/bodyache", defaultFrequency: "TDS", defaultDurationDays: 3 },
  { brandName: "Pan 40", genericName: "Pantoprazole", strength: "40mg", form: "TABLET", defaultDosage: "1 tablet empty stomach in morning", defaultFrequency: "OD", defaultDurationDays: 7 },
  { brandName: "Azithral 500", genericName: "Azithromycin", strength: "500mg", form: "TABLET", defaultDosage: "1 tablet 1 hour before dinner", defaultFrequency: "OD", defaultDurationDays: 3 },
  { brandName: "Telma 40", genericName: "Telmisartan", strength: "40mg", form: "TABLET", defaultDosage: "1 tablet post breakfast", defaultFrequency: "OD", defaultDurationDays: 30 },
  { brandName: "Glycomet GP 1", genericName: "Metformin + Glimepiride", strength: "500mg/1mg", form: "TABLET", defaultDosage: "1 tablet before morning meal", defaultFrequency: "BD", defaultDurationDays: 30 },
  { brandName: "Atorva 10", genericName: "Atorvastatin", strength: "10mg", form: "TABLET", defaultDosage: "1 tablet at bedtime", defaultFrequency: "OD", defaultDurationDays: 30 },
  { brandName: "Montair LC", genericName: "Montelukast + Levocetirizine", strength: "10mg/5mg", form: "TABLET", defaultDosage: "1 tablet at bedtime", defaultFrequency: "OD", defaultDurationDays: 10 },
  { brandName: "Emeset 4", genericName: "Ondansetron", strength: "4mg", form: "TABLET", defaultDosage: "1 tablet for nausea/vomiting", defaultFrequency: "SOS", defaultDurationDays: 3 },
  { brandName: "Meftal Spas", genericName: "Dicyclomine + Mefenamic Acid", strength: "10mg/250mg", form: "TABLET", defaultDosage: "1 tablet for spasmodic pain", defaultFrequency: "SOS", defaultDurationDays: 3 },
  { brandName: "Ciplox 500", genericName: "Ciprofloxacin", strength: "500mg", form: "TABLET", defaultDosage: "1 tablet after food", defaultFrequency: "BD", defaultDurationDays: 5 },
  { brandName: "Ascoril LS", genericName: "Levosalbutamol + Ambroxol + Guaifenesin", strength: "100ml", form: "SYRUP", defaultDosage: "5 ml thrice daily", defaultFrequency: "TDS", defaultDurationDays: 5 },
  { brandName: "Allegra 120", genericName: "Fexofenadine", strength: "120mg", form: "TABLET", defaultDosage: "1 tablet daily for allergy", defaultFrequency: "OD", defaultDurationDays: 7 },
  { brandName: "Becosules Z", genericName: "Vitamin B Complex with Zinc", strength: "Capsule", form: "CAPSULE", defaultDosage: "1 capsule with water after meal", defaultFrequency: "OD", defaultDurationDays: 15 },
  { brandName: "Shelcal 500", genericName: "Calcium + Vitamin D3", strength: "500mg/250IU", form: "TABLET", defaultDosage: "1 tablet post lunch", defaultFrequency: "OD", defaultDurationDays: 30 },
  { brandName: "Clavam 625", genericName: "Amoxicillin + Clavulanic Acid", strength: "625mg", form: "TABLET", defaultDosage: "1 tablet twice daily", defaultFrequency: "BD", defaultDurationDays: 5 },
  { brandName: "Pantocid DSR", genericName: "Pantoprazole + Domperidone", strength: "40mg/30mg", form: "CAPSULE", defaultDosage: "1 capsule early morning empty stomach", defaultFrequency: "OD", defaultDurationDays: 7 },
  { brandName: "Voveran 50", genericName: "Diclofenac Sodium", strength: "50mg", form: "TABLET", defaultDosage: "1 tablet after meals for severe pain", defaultFrequency: "SOS", defaultDurationDays: 3 },
  { brandName: "Kenacort 40", genericName: "Triamcinolone Acetonide", strength: "40mg/1ml", form: "INJECTION", defaultDosage: "1 ml deep intramuscular as directed", defaultFrequency: "SOS", defaultDurationDays: 1 },
  { brandName: "Betadine Ointment", genericName: "Povidone Iodine 5% w/w", strength: "15g", form: "OINTMENT", defaultDosage: "Apply thin film on cleaned wound", defaultFrequency: "BD", defaultDurationDays: 7 },
  { brandName: "Tobramycin Drops", genericName: "Tobramycin Ophthalmic 0.3%", strength: "5ml", form: "DROPS", defaultDosage: "2 drops in affected eye", defaultFrequency: "TDS", defaultDurationDays: 5 },
  { brandName: "Rantac 150", genericName: "Ranitidine Hydrochloride", strength: "150mg", form: "TABLET", defaultDosage: "1 tablet before food", defaultFrequency: "BD", defaultDurationDays: 5 },
  { brandName: "Zifi 200", genericName: "Cefixime", strength: "200mg", form: "TABLET", defaultDosage: "1 tablet after meals", defaultFrequency: "BD", defaultDurationDays: 5 },
  { brandName: "Combiflam", genericName: "Ibuprofen + Paracetamol", strength: "400mg/325mg", form: "TABLET", defaultDosage: "1 tablet after heavy meal for pain", defaultFrequency: "SOS", defaultDurationDays: 3 },
  { brandName: "Neurobion Forte", genericName: "Vitamin B-Complex with B12", strength: "Tablet", form: "TABLET", defaultDosage: "1 tablet daily after food", defaultFrequency: "OD", defaultDurationDays: 30 },
];

const CLINICAL_TARIFFS: Array<{
  name: string;
  category: ServiceTariffEntity["category"];
  price: string;
  taxRate: string;
  hsnSacCode: string;
}> = [
  { name: "General OPD Consultation", category: "CONSULTATION", price: "500.00", taxRate: "0.00", hsnSacCode: "998311" },
  { name: "Specialist / Super-Specialist Consultation", category: "CONSULTATION", price: "800.00", taxRate: "0.00", hsnSacCode: "998311" },
  { name: "Emergency / Triage Assessment", category: "CONSULTATION", price: "1000.00", taxRate: "0.00", hsnSacCode: "998311" },
  { name: "Complete Blood Count (CBC)", category: "LAB", price: "350.00", taxRate: "0.00", hsnSacCode: "998312" },
  { name: "Lipid Profile Extended", category: "LAB", price: "750.00", taxRate: "0.00", hsnSacCode: "998312" },
  { name: "Liver Function Test (LFT)", category: "LAB", price: "650.00", taxRate: "0.00", hsnSacCode: "998312" },
  { name: "Kidney Function Test (KFT / RFT)", category: "LAB", price: "600.00", taxRate: "0.00", hsnSacCode: "998312" },
  { name: "Glycated Hemoglobin (HbA1c)", category: "LAB", price: "550.00", taxRate: "0.00", hsnSacCode: "998312" },
  { name: "Urine Routine & Microscopy", category: "LAB", price: "200.00", taxRate: "0.00", hsnSacCode: "998312" },
  { name: "12-Lead Electrocardiogram (ECG)", category: "DIAGNOSTIC", price: "300.00", taxRate: "0.00", hsnSacCode: "998313" },
  { name: "Digital Chest X-Ray PA View", category: "DIAGNOSTIC", price: "450.00", taxRate: "0.00", hsnSacCode: "998313" },
  { name: "Ultrasonography (USG) Whole Abdomen", category: "DIAGNOSTIC", price: "1200.00", taxRate: "0.00", hsnSacCode: "998313" },
  { name: "Minor Wound Debridement & Dressing", category: "PROCEDURE", price: "400.00", taxRate: "0.00", hsnSacCode: "998314" },
  { name: "Simple Laceration Suturing (Up to 3 stitches)", category: "PROCEDURE", price: "900.00", taxRate: "0.00", hsnSacCode: "998314" },
  { name: "Intravenous (IV) Cannulation & Saline Infusion", category: "PROCEDURE", price: "350.00", taxRate: "0.00", hsnSacCode: "998314" },
];

async function seedMasterData() {
  console.log("==> Starting Master Data & Schema Seed Script");

  // Parse --org <organizationId> if provided
  let targetOrgId: string | null = null;
  const args = process.argv.slice(2);
  const orgIndex = args.indexOf("--org");
  if (orgIndex !== -1 && args[orgIndex + 1]) {
    targetOrgId = args[orgIndex + 1];
  }

  let org: { id: string; name: string } | undefined;
  if (targetOrgId) {
    const found = await db.select().from(organizations).where(eq(organizations.id, targetOrgId)).limit(1);
    org = found[0];
  }

  if (!org) {
    const firstOrg = await db.select().from(organizations).limit(1);
    org = firstOrg[0];
  }

  if (!org) {
    console.log("No organization found. Creating default organization 'Apex Multispeciality Clinic'...");
    const [createdOrg] = await db
      .insert(organizations)
      .values({
        name: "Apex Multispeciality Clinic",
        slug: "apex-clinic",
        legalName: "Apex Healthcare Systems Pvt Ltd",
        code: "APEX",
        primaryContactPhone: "+919876543210",
        primaryContactEmail: "contact@apexclinic.in",
        abdmFacilityId: "IN01100001",
        isActive: true,
      })
      .returning();
    org = createdOrg;
  }

  console.log(`Target Organization: ${org.name} (${org.id})`);

  // 1. Seed Clinic Profile
  const existingProfile = await db
    .select()
    .from(clinicProfiles)
    .where(eq(clinicProfiles.organizationId, org.id))
    .limit(1);

  if (existingProfile.length === 0) {
    await db.insert(clinicProfiles).values({
      organizationId: org.id,
      timezone: "Asia/Kolkata",
      defaultSlotMinutes: 15,
      workingHoursJson: {
        monday: { start: "09:00", end: "18:00", enabled: true },
        tuesday: { start: "09:00", end: "18:00", enabled: true },
        wednesday: { start: "09:00", end: "18:00", enabled: true },
        thursday: { start: "09:00", end: "18:00", enabled: true },
        friday: { start: "09:00", end: "18:00", enabled: true },
        saturday: { start: "09:00", end: "14:00", enabled: true },
        sunday: { start: "10:00", end: "13:00", enabled: false },
      },
      invoicePrefix: "INV",
    });
    console.log("✔ Created default clinic profile (Asia/Kolkata, 15m slots)");
  } else {
    console.log("✔ Clinic profile already exists");
  }

  // 2. Seed Default Doctors & Schedules
  const defaultDoctors = [
    { fullName: "Dr. Gaurav Kumar", specialty: "Cardiology", consultationFee: "800.00", phoneE164: "+919876543210" },
    { fullName: "Dr. Priya Sharma", specialty: "General Medicine", consultationFee: "500.00", phoneE164: "+919876543211" },
    { fullName: "Dr. Rajesh Mehta", specialty: "Pediatrics", consultationFee: "600.00", phoneE164: "+919876543212" },
  ];

  for (const docData of defaultDoctors) {
    let doc = (
      await db
        .select()
        .from(doctors)
        .where(and(eq(doctors.organizationId, org.id), eq(doctors.fullName, docData.fullName)))
        .limit(1)
    )[0];

    if (!doc) {
      const [insertedDoc] = await db
        .insert(doctors)
        .values({
          organizationId: org.id,
          fullName: docData.fullName,
          specialty: docData.specialty,
          consultationFee: docData.consultationFee,
          phoneE164: docData.phoneE164,
          isActive: true,
        })
        .returning();
      doc = insertedDoc;
      console.log(`✔ Seeded doctor: ${doc.fullName} (${doc.specialty})`);
    }

    // Seed weekly schedules for Mon - Fri (day 1 to 5)
    for (let day = 1; day <= 5; day++) {
      const existingSched = await db
        .select()
        .from(doctorSchedules)
        .where(
          and(
            eq(doctorSchedules.organizationId, org.id),
            eq(doctorSchedules.doctorId, doc.id),
            eq(doctorSchedules.dayOfWeek, day),
            eq(doctorSchedules.startTime, "09:00")
          )
        )
        .limit(1);

      if (existingSched.length === 0) {
        await db.insert(doctorSchedules).values({
          organizationId: org.id,
          doctorId: doc.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "13:00",
          slotDurationMins: 15,
          isActive: true,
        });
      }
    }
  }

  // 3. Seed 25 Medicines
  let medCount = 0;
  for (const med of INDIAN_MEDICINES) {
    const existing = await db
      .select()
      .from(medicineMaster)
      .where(
        and(
          eq(medicineMaster.organizationId, org.id),
          eq(medicineMaster.brandName, med.brandName),
          eq(medicineMaster.form, med.form)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(medicineMaster).values({
        organizationId: org.id,
        brandName: med.brandName,
        genericName: med.genericName,
        strength: med.strength,
        form: med.form,
        defaultDosage: med.defaultDosage,
        defaultFrequency: med.defaultFrequency,
        defaultDurationDays: med.defaultDurationDays,
        isActive: true,
      });
      medCount++;
    }
  }
  console.log(`✔ Seeded ${medCount} new medicines (total catalog: ${INDIAN_MEDICINES.length})`);

  // 4. Seed 15 Service Tariffs
  let tariffCount = 0;
  for (const tariff of CLINICAL_TARIFFS) {
    const existing = await db
      .select()
      .from(serviceTariffs)
      .where(
        and(
          eq(serviceTariffs.organizationId, org.id),
          eq(serviceTariffs.name, tariff.name)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(serviceTariffs).values({
        organizationId: org.id,
        name: tariff.name,
        category: tariff.category,
        price: tariff.price,
        taxRate: tariff.taxRate,
        hsnSacCode: tariff.hsnSacCode,
        isActive: true,
      });
      tariffCount++;
    }
  }
  console.log(`✔ Seeded ${tariffCount} new service tariffs (total tariffs: ${CLINICAL_TARIFFS.length})`);

  console.log("==> Seed Master Data completed successfully!");
}

seedMasterData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed script failed:", err);
    process.exit(1);
  });
