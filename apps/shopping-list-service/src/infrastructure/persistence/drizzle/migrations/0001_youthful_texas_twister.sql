CREATE TABLE "outbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"completion_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"event_version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_messages_completion_id_unique" ON "outbox_messages" USING btree ("completion_id");--> statement-breakpoint
CREATE INDEX "outbox_messages_pending_created_at_idx" ON "outbox_messages" USING btree ("created_at") WHERE "outbox_messages"."published_at" is null;