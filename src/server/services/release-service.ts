import { db } from "~/server/db";
import {
  releaseSchedules,
  releases,
  readingProgress,
  bookSections,
  books,
} from "~/server/db/schema";
import { eq, and, lte, desc, count } from "drizzle-orm";

export interface ReleaseSchedule {
  id: string;
  bookId: string;
  scheduleType: "daily" | "weekly" | "custom";
  daysOfWeek: number[]; // 1-7 (Monday-Sunday)
  releaseTime: string; // HH:MM format
  sectionsPerRelease: number;
  isActive: boolean;
}

export interface Release {
  id: string;
  bookId: string;
  sectionIds: string[];
  scheduledFor: Date;
  releasedAt?: Date;
  status: "scheduled" | "released" | "read";
}

export class ReleaseService {
  /**
   * Check and create releases for all active schedules
   * Called on page load to ensure releases are created when due
   */
  async checkAndCreateReleases(userId: string): Promise<void> {
    const activeSchedules = await this.getActiveSchedules(userId);

    for (const schedule of activeSchedules) {
      await this.processSchedule(schedule);
    }
  }

  /**
   * Get all active schedules for a user
   */
  private async getActiveSchedules(userId: string): Promise<ReleaseSchedule[]> {
    const schedules = await db
      .select()
      .from(releaseSchedules)
      .innerJoin(books, eq(releaseSchedules.bookId, books.id))
      .where(
        and(eq(books.userId, userId), eq(releaseSchedules.isActive, true)),
      );

    return schedules.map((s) => ({
      id: s.release_schedule.id,
      bookId: s.release_schedule.bookId,
      scheduleType: s.release_schedule.scheduleType as
        | "daily"
        | "weekly"
        | "custom",
      daysOfWeek: JSON.parse(s.release_schedule.daysOfWeek) as number[],
      releaseTime: s.release_schedule.releaseTime,
      sectionsPerRelease: s.release_schedule.sectionsPerRelease,
      isActive: s.release_schedule.isActive,
    }));
  }

  /**
   * Process a single schedule and create releases if needed
   */
  private async processSchedule(schedule: ReleaseSchedule): Promise<void> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if today is a scheduled day
    const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Convert Sunday=0 to Sunday=7
    if (!schedule.daysOfWeek.includes(todayDayOfWeek)) {
      return; // Not a scheduled day
    }

    // Parse release time
    const [hoursStr, minutesStr] = schedule.releaseTime.split(":");
    const hours = hoursStr ? Number.parseInt(hoursStr, 10) : 0;
    const minutes = minutesStr ? Number.parseInt(minutesStr, 10) : 0;

    if (isNaN(hours) || isNaN(minutes)) {
      return; // Invalid time format
    }

    const releaseTime = new Date(today);
    releaseTime.setHours(hours, minutes, 0, 0);

    // Check if release time has passed today
    if (now < releaseTime) {
      return; // Not time yet
    }

    // Check if we already have a release for today
    const existingRelease = await db
      .select()
      .from(releases)
      .where(
        and(
          eq(releases.bookId, schedule.bookId),
          eq(releases.scheduledFor, releaseTime),
        ),
      )
      .limit(1);

    if (existingRelease.length > 0) {
      return; // Already created
    }

    // Check if last 2 releases are unread (pause logic)
    const unreadCount = await this.getUnreadReleaseCount(schedule.bookId);
    if (unreadCount >= 2) {
      return; // Pause releases
    }

    // Create new release
    await this.createRelease(schedule, releaseTime);
  }

  /**
   * Get count of unread releases for a book
   */
  private async getUnreadReleaseCount(bookId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(releases)
      .where(and(eq(releases.bookId, bookId), eq(releases.status, "released")));

    return result[0]?.count || 0;
  }

  /**
   * Create a new release with the next sections
   */
  private async createRelease(
    schedule: ReleaseSchedule,
    scheduledFor: Date,
  ): Promise<void> {
    // Get next sections to release
    const nextSections = await this.getNextSections(
      schedule.bookId,
      schedule.sectionsPerRelease,
    );

    if (nextSections.length === 0) {
      return; // No more sections to release
    }

    // Create release record
    await db.insert(releases).values({
      bookId: schedule.bookId,
      sectionIds: JSON.stringify(nextSections.map((s) => s.id)),
      scheduledFor,
      releasedAt: new Date(),
      status: "released",
    });
  }

  /**
   * Create a release immediately for a given schedule (ignores schedule time/day).
   * Useful for seeding an initial release right after schedule creation.
   */
  async createImmediateRelease(schedule: ReleaseSchedule): Promise<void> {
    const now = new Date();
    await this.createRelease(schedule, now);
  }

  /**
   * Get next sections to release for a book
   */
  private async getNextSections(
    bookId: string,
    count: number,
  ): Promise<Array<{ id: string; orderIndex: number }>> {
    // Get all sections ordered by orderIndex
    const allSections = await db
      .select({ id: bookSections.id, orderIndex: bookSections.orderIndex })
      .from(bookSections)
      .where(eq(bookSections.bookId, bookId))
      .orderBy(bookSections.orderIndex);

    // Get sections that have been released
    const releasedSections = await db
      .select()
      .from(releases)
      .where(and(eq(releases.bookId, bookId), eq(releases.status, "released")));

    const releasedSectionIds = new Set<string>();
    releasedSections.forEach((release) => {
      const sectionIds = JSON.parse(release.sectionIds) as string[];
      sectionIds.forEach((id) => releasedSectionIds.add(id));
    });

    // Find next unreleased sections
    const nextSections = allSections
      .filter((section) => !releasedSectionIds.has(section.id))
      .slice(0, count);

    return nextSections;
  }

  /**
   * Get available releases for a user
   */
  async getAvailableReleases(userId: string): Promise<Release[]> {
    const userReleases = await db
      .select()
      .from(releases)
      .innerJoin(books, eq(releases.bookId, books.id))
      .where(and(eq(books.userId, userId), eq(releases.status, "released")))
      .orderBy(desc(releases.releasedAt));

    return userReleases.map((r) => ({
      id: r.release.id,
      bookId: r.release.bookId,
      sectionIds: JSON.parse(r.release.sectionIds) as string[],
      scheduledFor: r.release.scheduledFor,
      releasedAt: r.release.releasedAt || undefined,
      status: r.release.status as "scheduled" | "released" | "read",
    }));
  }

  /**
   * Mark a release as read
   */
  async markReleaseRead(releaseId: string, userId: string): Promise<void> {
    // Update release status
    await db
      .update(releases)
      .set({ status: "read" })
      .where(eq(releases.id, releaseId));

    // Update reading progress for all sections in the release
    const [release] = await db
      .select()
      .from(releases)
      .where(eq(releases.id, releaseId));

    if (!release) {
      throw new Error("Release not found");
    }

    const sectionIds = JSON.parse(release.sectionIds) as string[];

    for (const sectionId of sectionIds) {
      await db
        .insert(readingProgress)
        .values({
          userId,
          bookId: release.bookId,
          sectionId,
          releaseId,
          progressPercentage: "100.00",
          lastParagraphIndex: 0, // Will be updated by reading interface
          isRead: true,
          readAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [readingProgress.userId, readingProgress.sectionId],
          set: {
            progressPercentage: "100.00",
            isRead: true,
            readAt: new Date(),
            updatedAt: new Date(),
          },
        });
    }
  }

  /**
   * Get release schedule for a book
   */
  async getSchedule(bookId: string): Promise<ReleaseSchedule | null> {
    const [schedule] = await db
      .select()
      .from(releaseSchedules)
      .where(eq(releaseSchedules.bookId, bookId))
      .limit(1);

    if (!schedule) {
      return null;
    }

    return {
      id: schedule.id,
      bookId: schedule.bookId,
      scheduleType: schedule.scheduleType as "daily" | "weekly" | "custom",
      daysOfWeek: JSON.parse(schedule.daysOfWeek) as number[],
      releaseTime: schedule.releaseTime,
      sectionsPerRelease: schedule.sectionsPerRelease,
      isActive: schedule.isActive,
    };
  }

  /**
   * Create or update release schedule
   */
  async createSchedule(
    schedule: Omit<ReleaseSchedule, "id">,
  ): Promise<ReleaseSchedule> {
    const [newSchedule] = await db
      .insert(releaseSchedules)
      .values({
        bookId: schedule.bookId,
        scheduleType: schedule.scheduleType,
        daysOfWeek: JSON.stringify(schedule.daysOfWeek),
        releaseTime: schedule.releaseTime,
        sectionsPerRelease: schedule.sectionsPerRelease,
        isActive: schedule.isActive,
      })
      .returning();

    return {
      id: newSchedule?.id || "",
      bookId: newSchedule?.bookId || "",
      scheduleType:
        (newSchedule?.scheduleType as "daily" | "weekly" | "custom") || "daily",
      daysOfWeek: JSON.parse(newSchedule?.daysOfWeek || "") as number[],
      releaseTime: newSchedule?.releaseTime || "",
      sectionsPerRelease: newSchedule?.sectionsPerRelease || 0,
      isActive: newSchedule?.isActive || false,
    };
  }

  /**
   * Update release schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<Omit<ReleaseSchedule, "id" | "bookId">>,
  ): Promise<ReleaseSchedule> {
    const [updatedSchedule] = await db
      .update(releaseSchedules)
      .set({
        scheduleType: updates.scheduleType,
        daysOfWeek: updates.daysOfWeek
          ? JSON.stringify(updates.daysOfWeek)
          : undefined,
        releaseTime: updates.releaseTime,
        sectionsPerRelease: updates.sectionsPerRelease,
        isActive: updates.isActive,
        updatedAt: new Date(),
      })
      .where(eq(releaseSchedules.id, scheduleId))
      .returning();

    if (!updatedSchedule) {
      throw new Error("Schedule not found");
    }

    return {
      id: updatedSchedule.id,
      bookId: updatedSchedule.bookId,
      scheduleType: updatedSchedule.scheduleType as
        | "daily"
        | "weekly"
        | "custom",
      daysOfWeek: JSON.parse(updatedSchedule.daysOfWeek) as number[],
      releaseTime: updatedSchedule.releaseTime,
      sectionsPerRelease: updatedSchedule.sectionsPerRelease,
      isActive: updatedSchedule.isActive,
    };
  }

  /**
   * Delete release schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    await db
      .delete(releaseSchedules)
      .where(eq(releaseSchedules.id, scheduleId));
  }
}
