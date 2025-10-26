/**
 * Database schema for EP-Reader app
 * Defines tables for books, sections, schedules, and reading progress
 */

import { sql } from "drizzle-orm";
import {
  index,
  pgTableCreator,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  numeric,
  time,
} from "drizzle-orm/pg-core";

/**
 * Multi-project schema feature of Drizzle ORM
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `ep_reader_${name}`);

// Books table
export const books = createTable(
  "book",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d.text().notNull(),
    title: d.text().notNull(),
    author: d.text(),
    filePath: d.text().notNull(),
    coverImage: d.text(),
    totalChapters: d.integer().notNull().default(0),
    totalSections: d.integer().notNull().default(0),
    status: d.text().notNull().default("processing"), // processing, ready, active, completed
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("book_user_id_idx").on(t.userId),
    index("book_status_idx").on(t.status),
    index("book_created_at_idx").on(t.createdAt),
  ],
);

// Book sections table
export const bookSections = createTable(
  "book_section",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    bookId: d.uuid().notNull().references(() => books.id, { onDelete: "cascade" }),
    chapterNumber: d.integer().notNull(),
    sectionNumber: d.integer().notNull(),
    title: d.text().notNull(),
    content: d.text().notNull(), // HTML content
    wordCount: d.integer().notNull().default(0),
    estimatedReadTime: d.integer().notNull().default(0), // in minutes
    orderIndex: d.integer().notNull(),
    headerLevel: d.integer().notNull().default(1), // 1-3 for h1/h2/h3
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("book_section_book_id_idx").on(t.bookId),
    index("book_section_order_idx").on(t.orderIndex),
    index("book_section_chapter_idx").on(t.chapterNumber, t.sectionNumber),
  ],
);

// Release schedules table
export const releaseSchedules = createTable(
  "release_schedule",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    bookId: d.uuid().notNull().references(() => books.id, { onDelete: "cascade" }),
    scheduleType: d.text().notNull(), // daily, weekly, custom
    daysOfWeek: d.text().notNull(), // JSON array: [1,2,3,4,5]
    releaseTime: d.time().notNull(),
    sectionsPerRelease: d.integer().notNull().default(1),
    isActive: d.boolean().notNull().default(true),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("release_schedule_book_id_idx").on(t.bookId),
    index("release_schedule_active_idx").on(t.isActive),
  ],
);

// Releases table
export const releases = createTable(
  "release",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    bookId: d.uuid().notNull().references(() => books.id, { onDelete: "cascade" }),
    sectionIds: d.text().notNull(), // JSON array of section IDs
    scheduledFor: d.timestamp({ withTimezone: true }).notNull(),
    releasedAt: d.timestamp({ withTimezone: true }),
    status: d.text().notNull().default("scheduled"), // scheduled, released, read
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("release_book_id_idx").on(t.bookId),
    index("release_scheduled_for_idx").on(t.scheduledFor),
    index("release_status_idx").on(t.status),
  ],
);

// Reading progress table
export const readingProgress = createTable(
  "reading_progress",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d.text().notNull(),
    bookId: d.uuid().notNull().references(() => books.id, { onDelete: "cascade" }),
    sectionId: d.uuid().notNull().references(() => bookSections.id, { onDelete: "cascade" }),
    releaseId: d.uuid().references(() => releases.id, { onDelete: "cascade" }),
    progressPercentage: d.numeric(5, 2).notNull().default("0.00"),
    lastParagraphIndex: d.integer().notNull().default(0),
    isRead: d.boolean().notNull().default(false),
    readAt: d.timestamp({ withTimezone: true }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("reading_progress_user_id_idx").on(t.userId),
    index("reading_progress_book_id_idx").on(t.bookId),
    index("reading_progress_section_id_idx").on(t.sectionId),
    index("reading_progress_release_id_idx").on(t.releaseId),
  ],
);

// User settings table
export const userSettings = createTable(
  "user_setting",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d.text().notNull().unique(),
    timezone: d.text().notNull().default("UTC"),
    readingFontSize: d.text().notNull().default("medium"), // small, medium, large
    readingTheme: d.text().notNull().default("light"), // light, dark, sepia
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("user_settings_user_id_idx").on(t.userId),
  ],
);