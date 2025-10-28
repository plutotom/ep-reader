import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { books, bookSections, userSettings } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { db } from "~/server/db";
import { EpubParsingService } from "~/server/services/epub-parser";
import { unlink } from "fs/promises";

const epubParser = new EpubParsingService();

export const bookRouter = createTRPCRouter({
  // Upload and parse a book
  uploadBook: publicProcedure
    .input(
      z.object({
        filePath: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Parse the EPUB file
        const parsedBook = await epubParser.parseEpub(input.filePath);
        console.log(
          "parsedBook sections count in router:",
          parsedBook.sections?.length,
        );
        console.log("parsedBook totalSections:", parsedBook.totalSections);
        // Create book record
        const [book] = await db
          .insert(books)
          .values({
            userId: input.userId,
            title: parsedBook.title,
            author: parsedBook.author,
            filePath: input.filePath,
            coverImage: parsedBook.coverImage,
            totalChapters: parsedBook.totalChapters,
            totalSections: parsedBook.totalSections,
            status: "ready",
          })
          .returning();

        if (!book) {
          throw new Error("Failed to create book record");
        }

        // Create book sections (only if sections exist)
        if (parsedBook.sections && parsedBook.sections.length > 0) {
          const sectionsToInsert = parsedBook.sections.map((section) => ({
            bookId: book.id,
            chapterNumber: section.chapterNumber,
            sectionNumber: section.sectionNumber,
            title: section.title,
            content: section.content,
            wordCount: section.wordCount,
            estimatedReadTime: section.estimatedReadTime,
            orderIndex: section.orderIndex,
            headerLevel: section.headerLevel,
          }));

          await db.insert(bookSections).values(sectionsToInsert);
        }

        // Create user settings if they don't exist
        await db
          .insert(userSettings)
          .values({
            userId: input.userId,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
          .onConflictDoNothing();

        return book;
      } catch (error) {
        console.error("Error uploading book:", error);
        throw new Error(
          `Failed to upload book: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

  // Get all books for a user
  getBooks: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return await db
        .select()
        .from(books)
        .where(eq(books.userId, input.userId))
        .orderBy(desc(books.createdAt));
    }),

  // Get a single book with its sections
  getBook: publicProcedure
    .input(
      z.object({
        bookId: z.string(),
        userId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const [book] = await db
        .select()
        .from(books)
        .where(and(eq(books.id, input.bookId), eq(books.userId, input.userId)));

      if (!book) {
        throw new Error("Book not found");
      }

      const sections = await db
        .select()
        .from(bookSections)
        .where(eq(bookSections.bookId, input.bookId))
        .orderBy(bookSections.orderIndex);

      return {
        ...book,
        sections,
      };
    }),

  // Delete a book
  deleteBook: publicProcedure
    .input(
      z.object({
        bookId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Get book to access file path
      const [book] = await db
        .select()
        .from(books)
        .where(and(eq(books.id, input.bookId), eq(books.userId, input.userId)));

      if (!book) {
        throw new Error("Book not found");
      }

      // Delete book (cascade will handle sections, schedules, etc.)
      await db
        .delete(books)
        .where(and(eq(books.id, input.bookId), eq(books.userId, input.userId)));

      // Delete the file
      try {
        await unlink(book.filePath);
      } catch (error) {
        console.error("Error deleting file:", error);
        // Don't throw error for file deletion failure
      }

      return { success: true };
    }),

  // Update book status
  updateBookStatus: publicProcedure
    .input(
      z.object({
        bookId: z.string(),
        userId: z.string(),
        status: z.enum(["processing", "ready", "active", "completed"]),
      }),
    )
    .mutation(async ({ input }) => {
      const [book] = await db
        .update(books)
        .set({ status: input.status })
        .where(and(eq(books.id, input.bookId), eq(books.userId, input.userId)))
        .returning();

      if (!book) {
        throw new Error("Book not found");
      }

      return book;
    }),
});
