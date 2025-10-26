import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { userSettings } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";

export const settingsRouter = createTRPCRouter({
  // Get user settings
  getUserSettings: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [settings] = await db.select()
        .from(userSettings)
        .where(eq(userSettings.userId, input.userId))
        .limit(1);

      return settings || null;
    }),

  // Create user settings
  createUserSettings: publicProcedure
    .input(z.object({
      userId: z.string(),
      timezone: z.string().default("UTC"),
      readingFontSize: z.enum(["small", "medium", "large"]).default("medium"),
      readingTheme: z.enum(["light", "dark", "sepia"]).default("light"),
    }))
    .mutation(async ({ input }) => {
      const [settings] = await db.insert(userSettings).values({
        userId: input.userId,
        timezone: input.timezone,
        readingFontSize: input.readingFontSize,
        readingTheme: input.readingTheme,
      }).onConflictDoNothing().returning();

      return settings;
    }),

  // Update user settings
  updateUserSettings: publicProcedure
    .input(z.object({
      userId: z.string(),
      timezone: z.string().optional(),
      readingFontSize: z.enum(["small", "medium", "large"]).optional(),
      readingTheme: z.enum(["light", "dark", "sepia"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { userId, ...updates } = input;

      const [settings] = await db
        .update(userSettings)
        .set(updates)
        .where(eq(userSettings.userId, userId))
        .returning();

      return settings;
    }),

  // Upsert user settings (create or update)
  upsertUserSettings: publicProcedure
    .input(z.object({
      userId: z.string(),
      timezone: z.string(),
      readingFontSize: z.enum(["small", "medium", "large"]),
      readingTheme: z.enum(["light", "dark", "sepia"]),
    }))
    .mutation(async ({ input }) => {
      const [settings] = await db.insert(userSettings).values(input)
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: {
            timezone: input.timezone,
            readingFontSize: input.readingFontSize,
            readingTheme: input.readingTheme,
            updatedAt: new Date(),
          },
        })
        .returning();

      return settings;
    }),
});
