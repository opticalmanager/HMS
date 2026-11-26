import { db } from "../lib/drizzle";
import { doctors, appointments, patients, organizations } from "../db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const orgId = "249b1df5-1b91-4daa-bf21-0246dd6c337f";
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  console.log("Org:", org);

  const docs = await db.select().from(doctors).where(eq(doctors.organizationId, orgId));
  console.log("Doctors in Visual Eyes:", docs);

  const pts = await db.select().from(patients).where(eq(patients.organizationId, orgId));
  console.log("Patients in Visual Eyes:", pts);

  const appts = await db.select().from(appointments).where(eq(appointments.organizationId, orgId));
  console.log("Appointments in Visual Eyes:", appts);

  process.exit(0);
}

run().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
