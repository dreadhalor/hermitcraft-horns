import { NextRequest, NextResponse } from 'next/server';
import { db } from '@drizzle/db';
import * as schema from '../../../../../drizzle/schema';
import { desc, eq, sql, gte } from 'drizzle-orm';

// Admin API Key authentication
function authenticateAdmin(req: NextRequest): boolean {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
  const validKey = process.env.ADMIN_API_KEY;
  
  console.log('[Admin Auth Debug]', {
    hasValidKey: !!validKey,
    hasApiKey: !!apiKey,
    keysMatch: apiKey === validKey,
    receivedKeyPrefix: apiKey?.substring(0, 10),
    validKeyPrefix: validKey?.substring(0, 10),
  });
  
  if (!validKey) {
    console.error('ADMIN_API_KEY not configured');
    return false;
  }
  
  return apiKey === validKey;
}

export async function GET(req: NextRequest) {
  // Authenticate
  if (!authenticateAdmin(req)) {
    return NextResponse.json(
      { error: 'Unauthorized: Valid API key required' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const sinceDays = parseInt(searchParams.get('days') || '7', 10);
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

    // Total requests
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.generationLogs);

    // Recent requests (since date)
    const recentResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.generationLogs)
      .where(gte(schema.generationLogs.createdAt, since));

    // Requests by status
    const byStatus = await db
      .select({
        status: schema.generationLogs.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.generationLogs)
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
      .groupBy(schema.generationLogs.userId, schema.users.username)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Recent activity (requests per day)
    const recentActivity = await db
      .select({
        date: sql<string>`DATE(${schema.generationLogs.createdAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.generationLogs)
      .where(gte(schema.generationLogs.createdAt, since))
      .groupBy(sql`DATE(${schema.generationLogs.createdAt})`)
      .orderBy(desc(sql`DATE(${schema.generationLogs.createdAt})`));

    return NextResponse.json({
      total: totalResult[0]?.count || 0,
      recent: recentResult[0]?.count || 0,
      sinceDays,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s.count })),
      topUsers: byUser.map((u) => ({ 
        userId: u.userId, 
        username: u.username || '(anonymous)', 
        count: u.count 
      })),
      recentActivity: recentActivity.map((a) => ({ date: a.date, count: a.count })),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
