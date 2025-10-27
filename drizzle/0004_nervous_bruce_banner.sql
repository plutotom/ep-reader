CREATE TABLE "ep_reader_book" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"filePath" text NOT NULL,
	"coverImage" text,
	"totalChapters" integer DEFAULT 0 NOT NULL,
	"totalSections" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ep_reader_reading_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"bookId" uuid NOT NULL,
	"sectionId" uuid NOT NULL,
	"releaseId" uuid,
	"progress_percentage" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"lastParagraphIndex" integer DEFAULT 0 NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"readAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ep_reader_release_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookId" uuid NOT NULL,
	"scheduleType" text NOT NULL,
	"daysOfWeek" text NOT NULL,
	"releaseTime" time NOT NULL,
	"sectionsPerRelease" integer DEFAULT 1 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ep_reader_release" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookId" uuid NOT NULL,
	"sectionIds" text NOT NULL,
	"scheduledFor" timestamp with time zone NOT NULL,
	"releasedAt" timestamp with time zone,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ep_reader_user_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"readingFontSize" text DEFAULT 'medium' NOT NULL,
	"readingTheme" text DEFAULT 'light' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ep_reader_user_setting_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "template_post" RENAME TO "ep_reader_book_section";--> statement-breakpoint
ALTER TABLE "ep_reader_book_section" RENAME COLUMN "name" TO "chapterNumber";--> statement-breakpoint
ALTER TABLE "ep_reader_book_section" RENAME COLUMN "updatedAt" TO "sectionNumber";--> statement-breakpoint
DROP INDEX "post_created_at_idx";--> statement-breakpoint
ALTER TABLE "ep_reader_book_section" ALTER COLUMN "content" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ep_reader_book_section" ADD COLUMN "bookId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "ep_reader_book_section" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "ep_reader_book_section" ADD COLUMN "wordCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ep_reader_book_section" ADD COLUMN "estimatedReadTime" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ep_reader_book_section" ADD COLUMN "orderIndex" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "ep_reader_book_section" ADD COLUMN "headerLevel" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "ep_reader_reading_progress" ADD CONSTRAINT "ep_reader_reading_progress_bookId_ep_reader_book_id_fk" FOREIGN KEY ("bookId") REFERENCES "public"."ep_reader_book"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ep_reader_reading_progress" ADD CONSTRAINT "ep_reader_reading_progress_sectionId_ep_reader_book_section_id_fk" FOREIGN KEY ("sectionId") REFERENCES "public"."ep_reader_book_section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ep_reader_reading_progress" ADD CONSTRAINT "ep_reader_reading_progress_releaseId_ep_reader_release_id_fk" FOREIGN KEY ("releaseId") REFERENCES "public"."ep_reader_release"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ep_reader_release_schedule" ADD CONSTRAINT "ep_reader_release_schedule_bookId_ep_reader_book_id_fk" FOREIGN KEY ("bookId") REFERENCES "public"."ep_reader_book"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ep_reader_release" ADD CONSTRAINT "ep_reader_release_bookId_ep_reader_book_id_fk" FOREIGN KEY ("bookId") REFERENCES "public"."ep_reader_book"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "book_user_id_idx" ON "ep_reader_book" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "book_status_idx" ON "ep_reader_book" USING btree ("status");--> statement-breakpoint
CREATE INDEX "book_created_at_idx" ON "ep_reader_book" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "reading_progress_user_id_idx" ON "ep_reader_reading_progress" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "reading_progress_book_id_idx" ON "ep_reader_reading_progress" USING btree ("bookId");--> statement-breakpoint
CREATE INDEX "reading_progress_section_id_idx" ON "ep_reader_reading_progress" USING btree ("sectionId");--> statement-breakpoint
CREATE INDEX "reading_progress_release_id_idx" ON "ep_reader_reading_progress" USING btree ("releaseId");--> statement-breakpoint
CREATE INDEX "release_schedule_book_id_idx" ON "ep_reader_release_schedule" USING btree ("bookId");--> statement-breakpoint
CREATE INDEX "release_schedule_active_idx" ON "ep_reader_release_schedule" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "release_book_id_idx" ON "ep_reader_release" USING btree ("bookId");--> statement-breakpoint
CREATE INDEX "release_scheduled_for_idx" ON "ep_reader_release" USING btree ("scheduledFor");--> statement-breakpoint
CREATE INDEX "release_status_idx" ON "ep_reader_release" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_settings_user_id_idx" ON "ep_reader_user_setting" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "ep_reader_book_section" ADD CONSTRAINT "ep_reader_book_section_bookId_ep_reader_book_id_fk" FOREIGN KEY ("bookId") REFERENCES "public"."ep_reader_book"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "book_section_book_id_idx" ON "ep_reader_book_section" USING btree ("bookId");--> statement-breakpoint
CREATE INDEX "book_section_order_idx" ON "ep_reader_book_section" USING btree ("orderIndex");--> statement-breakpoint
CREATE INDEX "book_section_chapter_idx" ON "ep_reader_book_section" USING btree ("chapterNumber","sectionNumber");