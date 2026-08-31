CREATE TABLE "site_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logo_url" text,
	"brand_name" text DEFAULT 'Garage Inventory' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
