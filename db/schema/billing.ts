import { pgTable, text, timestamp, uuid, numeric, jsonb, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { branches } from "./branches";
import { patients } from "./patients";
import { profiles } from "./profiles";
import { appointments } from "./appointments";
import type { InvoiceItem } from "@/types/hms";

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceNumber: text("invoice_number").notNull().unique(), // e.g. "INV-2026-000001"
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    billerId: uuid("biller_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["DRAFT", "ISSUED", "PAID", "VOID"],
    }).default("ISSUED").notNull(),
    invoiceType: text("invoice_type", {
      enum: ["opd", "ipd", "pharmacy", "lab", "combined"],
    }).notNull(),
    relatedEntityId: uuid("related_entity_id"), // OPD consultation ID or IPD admission ID
    items: jsonb("items").$type<InvoiceItem[]>().notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    taxTotal: numeric("tax_total", { precision: 12, scale: 2 }).default("0.00").notNull(),
    discountTotal: numeric("discount_total", { precision: 12, scale: 2 }).default("0.00").notNull(),
    grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull(),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).default("0.00").notNull(),
    balanceDue: numeric("balance_due", { precision: 12, scale: 2 }).default("0.00").notNull(),
    paymentStatus: text("payment_status", {
      enum: ["pending", "partially_paid", "paid", "refunded"],
    }).default("pending").notNull(),
    paymentMode: text("payment_mode", {
      enum: ["cash", "upi", "card", "netbanking", "insurance"],
    }).default("cash").notNull(),
    transactionReference: text("transaction_reference"),
    insuranceProvider: text("insurance_provider"), // TPA Name e.g. Star Health, MediAssist
    insuranceClaimNumber: text("insurance_claim_number"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("invoices_organization_id_idx").on(table.organizationId)]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    receiptNumber: text("receipt_number").notNull().unique(), // e.g. "RCT-2026-000001"
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    collectedBy: uuid("collected_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMode: text("payment_mode", {
      enum: ["cash", "upi", "card", "netbanking", "insurance"],
    }).notNull(),
    transactionReference: text("transaction_reference"),
    isAdvance: text("is_advance").default("false"),
    paymentTimestamp: timestamp("payment_timestamp", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("payments_organization_id_idx").on(table.organizationId)]
);

export type InvoiceEntity = typeof invoices.$inferSelect;
export type NewInvoiceEntity = typeof invoices.$inferInsert;
export type PaymentEntity = typeof payments.$inferSelect;
