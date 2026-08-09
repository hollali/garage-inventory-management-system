import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "attendant"]);
export const stockMovementTypeEnum = pgEnum("stock_movement_type", ["in", "out"]);
export const stockReasonEnum = pgEnum("stock_reason", [
  "restock",
  "sale",
  "damage",
  "transfer",
  "adjustment",
  "return",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card",
  "mobile",
  "other",
]);
export const saleStatusEnum = pgEnum("sale_status", ["complete", "refunded"]);
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "draft",
  "received",
  "cancelled",
]);
export const transferRequestStatusEnum = pgEnum("transfer_request_status", [
  "pending",
  "approved",
  "rejected",
  "completed",
]);
export const workOrderStatusEnum = pgEnum("work_order_status", [
  "open",
  "in_progress",
  "completed",
  "cancelled",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull(),
    active: boolean("active").notNull().default(true),
    totpSecret: text("totp_secret"),
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_role_idx").on(table.role),
  ],
);

export const shops = pgTable(
  "shops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    location: text("location").notNull(),
    description: text("description"),
    assignedAttendantId: uuid("assigned_attendant_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("shops_attendant_unique").on(table.assignedAttendantId),
  ],
);

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id").references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull().default("General"),
    sku: text("sku"),
    barcode: text("barcode"),
    description: text("description"),
    imageUrl: text("image_url"),
    unitName: text("unit_name").notNull().default("piece"),
    itemsPerUnit: integer("items_per_unit").notNull().default(1),
    quantity: integer("quantity").notNull().default(0),
    unitPriceCents: integer("unit_price_cents").notNull().default(0),
    costCents: integer("cost_cents").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("inventory_shop_idx").on(table.shopId),
    index("inventory_shop_category_idx").on(table.shopId, table.category),
    index("inventory_barcode_idx").on(table.barcode),
  ],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id").references(() => shops.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: stockMovementTypeEnum("type").notNull(),
    reason: stockReasonEnum("reason").notNull(),
    quantity: integer("quantity").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("movement_item_idx").on(table.itemId),
    index("movement_shop_idx").on(table.shopId),
  ],
);

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    attendantId: uuid("attendant_id").references(() => users.id, { onDelete: "set null" }),
    customerName: text("customer_name"),
    customerContact: text("customer_contact"),
    vehicleReg: text("vehicle_reg"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
    discountCents: integer("discount_cents").notNull().default(0),
    status: saleStatusEnum("status").notNull().default("complete"),
    totalCents: integer("total_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sales_shop_idx").on(table.shopId),
    index("sales_attendant_idx").on(table.attendantId),
    index("sales_created_idx").on(table.createdAt),
  ],
);

export const saleItems = pgTable(
  "sale_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").references(() => inventoryItems.id, { onDelete: "set null" }),
    itemName: text("item_name").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [index("sale_items_sale_idx").on(table.saleId)],
);

export const saleReturns = pgTable(
  "sale_returns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    attendantId: uuid("attendant_id").references(() => users.id, { onDelete: "set null" }),
    refundCents: integer("refund_cents").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sale_returns_sale_idx").on(table.saleId)],
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("suppliers_name_idx").on(table.name)],
);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id").references(() => shops.id, { onDelete: "set null" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    status: purchaseOrderStatusEnum("status").notNull().default("draft"),
    totalCents: integer("total_cents").notNull().default(0),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("purchase_orders_shop_idx").on(table.shopId),
    index("purchase_orders_supplier_idx").on(table.supplierId),
    index("purchase_orders_status_idx").on(table.status),
  ],
);

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").references(() => inventoryItems.id, { onDelete: "set null" }),
    itemName: text("item_name").notNull(),
    quantityOrdered: integer("quantity_ordered").notNull(),
    quantityReceived: integer("quantity_received").notNull().default(0),
    unitCostCents: integer("unit_cost_cents").notNull(),
  },
  (table) => [index("po_items_order_idx").on(table.purchaseOrderId)],
);

export const transferRequests = pgTable(
  "transfer_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromShopId: uuid("from_shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    toShopId: uuid("to_shop_id").references(() => shops.id, { onDelete: "set null" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    itemName: text("item_name").notNull(),
    quantity: integer("quantity").notNull(),
    status: transferRequestStatusEnum("status").notNull().default("pending"),
    note: text("note"),
    requestedBy: uuid("requested_by").references(() => users.id, { onDelete: "set null" }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("transfer_requests_from_idx").on(table.fromShopId),
    index("transfer_requests_status_idx").on(table.status),
  ],
);

export const workOrders = pgTable(
  "work_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    vehicleReg: text("vehicle_reg"),
    customerName: text("customer_name"),
    customerContact: text("customer_contact"),
    status: workOrderStatusEnum("status").notNull().default("open"),
    labourCents: integer("labour_cents").notNull().default(0),
    partsTotalCents: integer("parts_total_cents").notNull().default(0),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("work_orders_shop_idx").on(table.shopId),
    index("work_orders_status_idx").on(table.status),
  ],
);

export const workOrderItems = pgTable(
  "work_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workOrderId: uuid("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").references(() => inventoryItems.id, { onDelete: "set null" }),
    itemName: text("item_name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
  },
  (table) => [index("work_order_items_order_idx").on(table.workOrderId)],
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull(),
    actorRole: roleEnum("actor_role").notNull(),
    shopId: uuid("shop_id").references(() => shops.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("activity_shop_idx").on(table.shopId),
    index("activity_actor_idx").on(table.actorId),
    index("activity_created_idx").on(table.createdAt),
    index("activity_action_idx").on(table.action),
  ],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("reset_token_hash_idx").on(table.tokenHash)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Shop = typeof shops.$inferSelect;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type TransferRequest = typeof transferRequests.$inferSelect;
export type WorkOrder = typeof workOrders.$inferSelect;
