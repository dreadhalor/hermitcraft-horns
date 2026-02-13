import { NextRequest, NextResponse } from 'next/server';
import { db } from '@drizzle/db';
import * as schema from '../../../../../drizzle/schema';
import { desc, eq, sql, gte } from 'drizzle-orm';

// Admin API Key authentication
function authenticateAdmin(req: NextRequest): boolean {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
  const validKey = process.env.ADMIN_API_KEY;
  
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
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const logs = await db
      .select({
        id: schema.generationLogs.id,
        userId: schema.generationLogs.userId,
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

    return NextResponse.json({ logs, count: logs.length });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
