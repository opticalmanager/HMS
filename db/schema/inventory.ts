import { pgTable, text, timestamp, uuid, integer, numeric, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { branches } from "./branches";
import { profiles } from "./profiles";

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(), // e.g. "MED-PCM-500"
    name: text("name").notNull(), // e.g. "Paracetamol 500mg"
    genericName: text("generic_name"), // e.g. "Paracetamol / Acetaminophen"
    category: text("category", {
      enum: ["tablet", "syrup", "injection", "consumable", "equipment"],
    }).notNull(),
    manufacturer: text("manufacturer"),
    rackLocation: text("rack_location"), // e.g. "Aisle 2 - Shelf B"
    reorderLevel: integer("reorder_level").default(50).notNull(),
    gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default("12.00").notNull(),
    isActive: text("is_active").default("true").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("inventory_items_organization_id_idx").on(table.organizationId)]
);

export const inventoryBatches = pgTable(
  "inventory_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    batchNumber: text("batch_number").notNull(),
    expiryDate: text("expiry_date").notNull(), // YYYY-MM-DD
    quantityInStock: integer("quantity_in_stock").default(0).notNull(),
    purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }).notNull(),
    sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("inventory_batches_organization_id_idx").on(table.organizationId)]
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => inventoryBatches.id, { onDelete: "cascade" }),
    movementType: text("movement_type", {
      enum: ["purchase_grn", "dispense_opd", "dispense_ipd", "adjustment", "return_vendor", "expired_scrap"],
    }).notNull(),
    quantity: integer("quantity").notNull(), // Positive for stock in, negative for stock out
    referenceDocument: text("reference_document"), // e.g. "INV-2026-000001" or "GRN-2026-000001"
    performedBy: uuid("performed_by").references(() => profiles.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("stock_movements_organization_id_idx").on(table.organizationId)]
);

export type InventoryItemEntity = typeof inventoryItems.$inferSelect;
export type InventoryBatchEntity = typeof inventoryBatches.$inferSelect;
export type StockMovementEntity = typeof stockMovements.$inferSelect;
