import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { readingProgress, bookSections } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { db } from "~/server/db";

export const progressRouter = createTRPCRouter({
  // Update reading progress for a section
  updateProgress: publicProcedure
    .input(z.object({
      userId: z.string(),
      sectionId: z.string(),
      releaseId: z.string().optional(),
      progressPercentage: z.number().min(0).max(100),
      lastParagraphIndex: z.number().min(0),
    }))
    .mutation(async ({ input }) => {
      const [progress] = await db.insert(readingProgress).values({
        userId: input.userId,
        sectionId: input.sectionId,
        releaseId: input.releaseId,
        progressPercentage: input.progressPercentage.toString(),
        lastParagraphIndex: input.lastParagraphIndex,
        isRead: input.progressPercentage >= 100,
        readAt: input.progressPercentage >= 100 ? new Date() : undefined,
      }).onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.sectionId],
        set: {
          progressPercentage: input.progressPercentage.toString(),
          lastParagraphIndex: input.lastParagraphIndex,
          isRead: input.progressPercentage >= 100,
          readAt: input.progressPercentage >= 100 ? new Date() : undefined,
          updatedAt: new Date(),
        },
      }).returning();

      return progress;
    }),

  // Get progress for a specific section
  getProgress: publicProcedure
    .input(z.object({
      userId: z.string(),
      sectionId: z.string(),
    }))
    .query(async ({ input }) => {
      const [progress] = await db.select()
        .from(readingProgress)
        .where(and(
          eq(readingProgress.userId, input.userId),
          eq(readingProgress.sectionId, input.sectionId)
        ))
        .limit(1);

      return progress;
    }),

  // Mark section as read
  markSectionRead: publicProcedure
    .input(z.object({
      userId: z.string(),
      sectionId: z.string(),
      releaseId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [progress] = await db.insert(readingProgress).values({
        userId: input.userId,
        sectionId: input.sectionId,
        releaseId: input.releaseId,
        progressPercentage: "100.00",
        lastParagraphIndex: 0,
        isRead: true,
        readAt: new Date(),
      }).onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.sectionId],
        set: {
          progressPercentage: "100.00",
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        },
      }).returning();

      return progress;
    }),

  // Get book progress stats
  getBookProgress: publicProcedure
    .input(z.object({
      userId: z.string(),
      bookId: z.string(),
    }))
    .query(async ({ input }) => {
      // Get all sections for the book
      const sections = await db.select()
        .from(bookSections)
        .where(eq(bookSections.bookId, input.bookId))
        .orderBy(bookSections.orderIndex);

      // Get progress for all sections
      const progressRecords = await db.select()
        .from(readingProgress)
        .where(and(
          eq(readingProgress.userId, input.userId),
          eq(readingProgress.bookId, input.bookId)
        ));

      // Calculate stats
      const totalSections = sections.length;
      const readSections = progressRecords.filter(p => p.isRead).length;
      const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0);
      const readWords = sections
        .filter(s => progressRecords.some(p => p.sectionId === s.id && p.isRead))
        .reduce((sum, s) => sum + s.wordCount, 0);

      return {
        totalSections,
        readSections,
        totalWords,
        readWords,
        progressPercentage: totalSections > 0 ? (readSections / totalSections) * 100 : 0,
        estimatedTimeRemaining: sections
          .filter(s => !progressRecords.some(p => p.sectionId === s.id && p.isRead))
          .reduce((sum, s) => sum + s.estimatedReadTime, 0),
      };
    }),

  // Get section with progress info
  getSectionWithProgress: publicProcedure
    .input(z.object({
      userId: z.string(),
      sectionId: z.string(),
    }))
    .query(async ({ input }) => {
      const [section] = await db.select()
        .from(bookSections)
        .where(eq(bookSections.id, input.sectionId))
        .limit(1);

      if (!section) {
        throw new Error("Section not found");
      }

      const [progress] = await db.select()
        .from(readingProgress)
        .where(and(
          eq(readingProgress.userId, input.userId),
          eq(readingProgress.sectionId, input.sectionId)
        ))
        .limit(1);

      return {
        section,
        progress: progress || {
          progressPercentage: "0.00",
          lastParagraphIndex: 0,
          isRead: false,
        },
      };
    }),
});
