-- Migration: Create EP-Reader tables
-- Generated manually for EP-Reader app

-- Drop existing template_post table
DROP TABLE IF EXISTS "template_post";

-- Create books table
CREATE TABLE IF NOT EXISTS "ep_reader_book" (
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

-- Create book_sections table
CREATE TABLE IF NOT EXISTS "ep_reader_book_section" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookId" uuid NOT NULL,
	"chapterNumber" integer NOT NULL,
	"sectionNumber" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"wordCount" integer DEFAULT 0 NOT NULL,
	"estimatedReadTime" integer DEFAULT 0 NOT NULL,
	"orderIndex" integer NOT NULL,
	"headerLevel" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create release_schedules table
CREATE TABLE IF NOT EXISTS "ep_reader_release_schedule" (
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

-- Create releases table
CREATE TABLE IF NOT EXISTS "ep_reader_release" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookId" uuid NOT NULL,
	"sectionIds" text NOT NULL,
	"scheduledFor" timestamp with time zone NOT NULL,
	"releasedAt" timestamp with time zone,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create reading_progress table
CREATE TABLE IF NOT EXISTS "ep_reader_reading_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"bookId" uuid NOT NULL,
	"sectionId" uuid NOT NULL,
	"releaseId" uuid,
	"progressPercentage" numeric(5,2) DEFAULT '0.00' NOT NULL,
	"lastParagraphIndex" integer DEFAULT 0 NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"readAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS "ep_reader_user_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"readingFontSize" text DEFAULT 'medium' NOT NULL,
	"readingTheme" text DEFAULT 'light' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "ep_reader_book_section" ADD CONSTRAINT "ep_reader_book_section_bookId_ep_reader_book_id_fk" FOREIGN KEY ("bookId") REFERENCES "ep_reader_book"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ep_reader_release_schedule" ADD CONSTRAINT "ep_reader_release_schedule_bookId_ep_reader_book_id_fk" FOREIGN KEY ("bookId") REFERENCES "ep_reader_book"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ep_reader_release" ADD CONSTRAINT "ep_reader_release_bookId_ep_reader_book_id_fk" FOREIGN KEY ("bookId") REFERENCES "ep_reader_book"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ep_reader_reading_progress" ADD CONSTRAINT "ep_reader_reading_progress_bookId_ep_reader_book_id_fk" FOREIGN KEY ("bookId") REFERENCES "ep_reader_book"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ep_reader_reading_progress" ADD CONSTRAINT "ep_reader_reading_progress_sectionId_ep_reader_book_section_id_fk" FOREIGN KEY ("sectionId") REFERENCES "ep_reader_book_section"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ep_reader_reading_progress" ADD CONSTRAINT "ep_reader_reading_progress_releaseId_ep_reader_release_id_fk" FOREIGN KEY ("releaseId") REFERENCES "ep_reader_release"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "book_user_id_idx" ON "ep_reader_book" USING btree ("userId");
CREATE INDEX IF NOT EXISTS "book_status_idx" ON "ep_reader_book" USING btree ("status");
CREATE INDEX IF NOT EXISTS "book_created_at_idx" ON "ep_reader_book" USING btree ("createdAt");
CREATE INDEX IF NOT EXISTS "book_section_book_id_idx" ON "ep_reader_book_section" USING btree ("bookId");
CREATE INDEX IF NOT EXISTS "book_section_order_idx" ON "ep_reader_book_section" USING btree ("orderIndex");
CREATE INDEX IF NOT EXISTS "book_section_chapter_idx" ON "ep_reader_book_section" USING btree ("chapterNumber","sectionNumber");
CREATE INDEX IF NOT EXISTS "release_schedule_book_id_idx" ON "ep_reader_release_schedule" USING btree ("bookId");
CREATE INDEX IF NOT EXISTS "release_schedule_active_idx" ON "ep_reader_release_schedule" USING btree ("isActive");
CREATE INDEX IF NOT EXISTS "release_book_id_idx" ON "ep_reader_release" USING btree ("bookId");
CREATE INDEX IF NOT EXISTS "release_scheduled_for_idx" ON "ep_reader_release" USING btree ("scheduledFor");
CREATE INDEX IF NOT EXISTS "release_status_idx" ON "ep_reader_release" USING btree ("status");
CREATE INDEX IF NOT EXISTS "reading_progress_user_id_idx" ON "ep_reader_reading_progress" USING btree ("userId");
CREATE INDEX IF NOT EXISTS "reading_progress_book_id_idx" ON "ep_reader_reading_progress" USING btree ("bookId");
CREATE INDEX IF NOT EXISTS "reading_progress_section_id_idx" ON "ep_reader_reading_progress" USING btree ("sectionId");
CREATE INDEX IF NOT EXISTS "reading_progress_release_id_idx" ON "ep_reader_reading_progress" USING btree ("releaseId");
CREATE INDEX IF NOT EXISTS "user_settings_user_id_idx" ON "ep_reader_user_setting" USING btree ("userId");

-- Add unique constraint for user_settings
ALTER TABLE "ep_reader_user_setting" ADD CONSTRAINT "ep_reader_user_setting_userId_unique" UNIQUE("userId");
