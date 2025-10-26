import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { ReleaseService } from "~/server/services/release-service";

const releaseService = new ReleaseService();

export const scheduleRouter = createTRPCRouter({
  // Create release schedule
  createSchedule: publicProcedure
    .input(z.object({
      bookId: z.string(),
      scheduleType: z.enum(["daily", "weekly", "custom"]),
      daysOfWeek: z.array(z.number().min(1).max(7)), // 1-7 (Monday-Sunday)
      releaseTime: z.string(), // HH:MM format
      sectionsPerRelease: z.number().min(1).max(3),
    }))
    .mutation(async ({ input }) => {
      return await releaseService.createSchedule({
        bookId: input.bookId,
        scheduleType: input.scheduleType,
        daysOfWeek: input.daysOfWeek,
        releaseTime: input.releaseTime,
        sectionsPerRelease: input.sectionsPerRelease,
        isActive: true,
      });
    }),

  // Update release schedule
  updateSchedule: publicProcedure
    .input(z.object({
      scheduleId: z.string(),
      scheduleType: z.enum(["daily", "weekly", "custom"]).optional(),
      daysOfWeek: z.array(z.number().min(1).max(7)).optional(),
      releaseTime: z.string().optional(),
      sectionsPerRelease: z.number().min(1).max(3).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { scheduleId, ...updates } = input;
      return await releaseService.updateSchedule(scheduleId, updates);
    }),

  // Get schedule for a book
  getSchedule: publicProcedure
    .input(z.object({ bookId: z.string() }))
    .query(async ({ input }) => {
      return await releaseService.getSchedule(input.bookId);
    }),

  // Delete schedule
  deleteSchedule: publicProcedure
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ input }) => {
      await releaseService.deleteSchedule(input.scheduleId);
      return { success: true };
    }),

  // Check and create releases (called on page load)
  checkReleases: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      await releaseService.checkAndCreateReleases(input.userId);
      return { success: true };
    }),

  // Get available releases
  getAvailableReleases: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return await releaseService.getAvailableReleases(input.userId);
    }),

  // Mark release as read
  markReleaseRead: publicProcedure
    .input(z.object({
      releaseId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await releaseService.markReleaseRead(input.releaseId, input.userId);
      return { success: true };
    }),
});
