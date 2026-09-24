ALTER TYPE "public"."payment_method" ADD VALUE 'split';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "reserved_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "payment_breakdown" jsonb;