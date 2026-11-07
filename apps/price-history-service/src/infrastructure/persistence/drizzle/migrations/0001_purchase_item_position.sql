ALTER TABLE "purchase_items" ADD COLUMN "position" integer;
--> statement-breakpoint
WITH ranked AS (
  SELECT "id", (row_number() OVER (PARTITION BY "purchase_id" ORDER BY "id") - 1)::integer AS pos
  FROM "purchase_items"
)
UPDATE "purchase_items" AS items
SET "position" = ranked.pos
FROM ranked
WHERE items."id" = ranked."id";
--> statement-breakpoint
ALTER TABLE "purchase_items" ALTER COLUMN "position" SET NOT NULL;