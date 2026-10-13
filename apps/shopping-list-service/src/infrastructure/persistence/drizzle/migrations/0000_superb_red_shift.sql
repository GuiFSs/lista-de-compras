CREATE TABLE "shopping_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_normalized" text NOT NULL,
	"planned_quantity" numeric(12, 3),
	"unit" text,
	"planned_price" numeric(12, 2),
	"purchased_quantity" numeric(12, 3),
	"purchased_unit" text,
	"unit_price" numeric(12, 2),
	"purchased_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_list_items_name_normalized_active_unique" ON "shopping_list_items" USING btree ("name_normalized") WHERE "shopping_list_items"."removed_at" is null;