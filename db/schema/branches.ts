import { pgTable, text, timestamp, boolean, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    branchCode: text("branch_code").notNull(), // e.g. "MAIN", "WEST"
    gstin: text("gstin"),
    stateCode: text("state_code").default("27"), // e.g. 27 for Maharashtra
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    pincode: text("pincode").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    printHeaderConfig: jsonb("print_header_config").$type<{
      hospitalName: string;
      tagline?: string;
      regNumber?: string;
      phone: string;
      email?: string;
      address: string;
      logoBase64?: string;
    }>(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("branches_organization_id_idx").on(table.organizationId)]
);

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
