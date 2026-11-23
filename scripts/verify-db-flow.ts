import { db } from "../lib/drizzle";
import { patients } from "../db/schema/patients";
import { appointments } from "../db/schema/appointments";
import { eq } from "drizzle-orm";

async function main() {
  await db
    .update(patients)
    .set({
      fullName: "Mr. ankit",
      uhid: "UHID-2026-0295",
      allergies: ["Penicillin", "Sulfa"],
    })
    .where(eq(patients.phone, "8178962366"));

  console.log("Updated patient 8178962366 to Mr. ankit");

  const appts = await db.select().from(appointments);
  console.log("Total appointments:", appts.length);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
