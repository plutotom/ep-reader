import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { posts } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  getAll: publicProcedure.query(async () => {
    return await db.select().from(posts).orderBy(posts.createdAt);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const result = await db.select().from(posts).where(eq(posts.id, input.id));
      return result[0];
    }),

  create: publicProcedure
    .input(z.object({ 
      name: z.string().min(1),
      content: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await db.insert(posts).values({
        name: input.name,
        content: input.content,
      }).returning();
      return result[0];
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      content: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const result = await db
        .update(posts)
        .set(updateData)
        .where(eq(posts.id, id))
        .returning();
      return result[0];
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(posts).where(eq(posts.id, input.id));
      return { success: true };
    }),
});