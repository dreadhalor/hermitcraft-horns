import { z } from 'zod';
import { publicProcedure } from '../trpc';
import { db } from '@drizzle/db';
import * as schema from '../../../drizzle/schema';
import { desc, eq, and, gte, sql } from 'drizzle-orm';

// Admin user IDs - supports multiple comma-separated IDs
const ADMIN_USER_IDS = (process.env.ADMIN_USER_ID || 'user_2qxmZM0H7kT9Lr8WPa3VXjcyLqN')
  .split(',')
  .map(id => id.trim());

// Helper to check if user is admin
function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId);
}

export const getGenerationLogs = publicProcedure
  .input(
    z.object({
      adminUserId: z.string(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }),
  )
  .query(async ({ input: { adminUserId, limit, offset } }) => {
    if (!isAdmin(adminUserId)) {
      throw new Error('Unauthorized: Admin access required');
    }

    const logs = await db
      .select({
        id: schema.generationLogs.id,
        userId: schema.generationLogs.userId,
        source: schema.generationLogs.source,
        username: schema.users.username,
        videoUrl: schema.generationLogs.videoUrl,
        start: schema.generationLogs.start,
        end: schema.generationLogs.end,
        status: schema.generationLogs.status,
        errorMessage: schema.generationLogs.errorMessage,
        taskId: schema.generationLogs.taskId,
        createdAt: schema.generationLogs.createdAt,
        completedAt: schema.generationLogs.completedAt,
      })
      .from(schema.generationLogs)
      .leftJoin(schema.users, eq(schema.generationLogs.userId, schema.users.id))
      .orderBy(desc(schema.generationLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return logs;
  });

export const getGenerationStats = publicProcedure
  .input(
    z.object({
      adminUserId: z.string(),
      since: z.date().optional(),
    }),
  )
  .query(async ({ input: { adminUserId, since } }) => {
    if (!isAdmin(adminUserId)) {
      throw new Error('Unauthorized: Admin access required');
    }

    const whereClause = since
      ? gte(schema.generationLogs.createdAt, since)
      : undefined;

    // Total requests
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.generationLogs)
      .where(whereClause);

    // Requests by status
    const byStatus = await db
      .select({
        status: schema.generationLogs.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.generationLogs)
      .where(whereClause)
      .groupBy(schema.generationLogs.status);

    // Requests by user (top 10)
    const byUser = await db
      .select({
        userId: schema.generationLogs.userId,
        username: schema.users.username,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.generationLogs)
      .leftJoin(schema.users, eq(schema.generationLogs.userId, schema.users.id))
      .where(whereClause)
      .groupBy(schema.generationLogs.userId, schema.users.username)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Recent activity (requests per day for last 7 days)
    const recentActivity = await db
      .select({
        date: sql<string>`DATE(${schema.generationLogs.createdAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.generationLogs)
      .where(
        since
          ? whereClause
          : gte(schema.generationLogs.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      )
      .groupBy(sql`DATE(${schema.generationLogs.createdAt})`)
      .orderBy(desc(sql`DATE(${schema.generationLogs.createdAt})`));

    return {
      total: totalResult[0]?.count || 0,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s.count })),
      topUsers: byUser.map((u) => ({ userId: u.userId, username: u.username, count: u.count })),
      recentActivity: recentActivity.map((a) => ({ date: a.date, count: a.count })),
    };
  });
