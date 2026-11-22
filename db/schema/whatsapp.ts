import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { branches } from "./branches";
import { patients } from "./patients";

export const whatsappTemplates = pgTable(
  "whatsapp_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    templateName: text("template_name").notNull(), // Meta Approved Template Name
    category: text("category", {
      enum: ["appointment_confirmation", "prescription_ready", "ipd_discharge", "lab_report", "bill_receipt", "reminder"],
    }).notNull(),
    language: text("language").default("en").notNull(),
    status: text("status", { enum: ["APPROVED", "PENDING", "REJECTED"] }).default("APPROVED").notNull(),
    headerText: text("header_text"),
    bodyText: text("body_text").notNull(),
    footerText: text("footer_text"),
    sampleVariables: jsonb("sample_variables").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("whatsapp_templates_organization_id_idx").on(table.organizationId)]
);

export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
    recipientPhone: text("recipient_phone").notNull(), // E.164 e.g. "919876543210"
    wabaMessageId: text("waba_message_id"), // Meta WAMID
    templateName: text("template_name").notNull(),
    messageType: text("message_type", { enum: ["template", "session", "interactive"] }).default("template").notNull(),
    payloadSent: jsonb("payload_sent"),
    status: text("status", {
      enum: ["queued", "sent", "delivered", "read", "failed"],
    }).default("queued").notNull(),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("whatsapp_messages_organization_id_idx").on(table.organizationId)]
);

export type WhatsappTemplateEntity = typeof whatsappTemplates.$inferSelect;
export type WhatsappMessageEntity = typeof whatsappMessages.$inferSelect;
