CREATE TABLE "user_shops" (
	"user_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_shops_user_id_shop_id_pk" PRIMARY KEY("user_id","shop_id")
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_shop_id_shops_id_fk";
--> statement-breakpoint
DROP INDEX "users_shop_idx";--> statement-breakpoint
ALTER TABLE "user_shops" ADD CONSTRAINT "user_shops_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_shops" ADD CONSTRAINT "user_shops_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_shops_shop_idx" ON "user_shops" USING btree ("shop_id");--> statement-breakpoint
INSERT INTO "user_shops" ("user_id", "shop_id")
SELECT "id", "shop_id" FROM "users" WHERE "shop_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "shop_id";