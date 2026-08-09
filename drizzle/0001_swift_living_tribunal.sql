ALTER TABLE "inventory_items" ALTER COLUMN "shop_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "shop_id" DROP NOT NULL;