CREATE TABLE "template_post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"content" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DROP TABLE "read-it-later_article" CASCADE;--> statement-breakpoint
DROP TABLE "read-it-later_folder" CASCADE;--> statement-breakpoint
DROP TABLE "read-it-later_highlight" CASCADE;--> statement-breakpoint
DROP TABLE "read-it-later_note" CASCADE;--> statement-breakpoint
CREATE INDEX "post_created_at_idx" ON "template_post" USING btree ("createdAt");--> statement-breakpoint
DROP TYPE "public"."highlight_color";