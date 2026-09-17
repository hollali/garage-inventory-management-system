ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "shop_id" uuid;--> statement-breakpoint
UPDATE "users" SET "username" = lower(split_part("email", '@', 1));--> statement-breakpoint
UPDATE "users"
SET "username" = "username" || '_' || substring(replace(("id")::text, '-', '') from 1 for 6)
WHERE (
  SELECT count(*)
  FROM "users" AS "u2"
  WHERE lower("u2"."username") = lower("users"."username")
) > 1;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
UPDATE "users"
SET "shop_id" = "shops"."id"
FROM "shops"
WHERE "users"."id" = "shops"."assigned_attendant_id";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shops_name_idx" ON "shops" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_shop_idx" ON "users" USING btree ("shop_id");--> statement-breakpoint
ALTER TABLE "shops" DROP CONSTRAINT "shops_assigned_attendant_id_users_id_fk";--> statement-breakpoint
DROP INDEX "shops_attendant_unique";--> statement-breakpoint
ALTER TABLE "shops" DROP COLUMN "assigned_attendant_id";