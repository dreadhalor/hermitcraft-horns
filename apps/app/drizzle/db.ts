import './env-config';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql as vercelSql } from '@vercel/postgres';
import * as schema from './schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { EditClipSchema } from '@/schemas';
import { TimeRange } from '@/lib/utils';

export const db = drizzle(vercelSql, { schema });

export * from './db-fxns/user';

export const hasLikedClip = async (userId: string, clipId: string) => {
  const result = await db
    .select()
    .from(schema.likes)
    .where(and(eq(schema.likes.user, userId), eq(schema.likes.clip, clipId)))
    .limit(1);

  return result.length > 0;
};
export const countLikes = async (clipId: string) => {
  const result = await db
    .select()
    .from(schema.likes)
    .where(eq(schema.likes.clip, clipId));

  return result.length;
};

const getTimeFilter = (timeFilter: TimeRange) => {
  const now = new Date();

  switch (timeFilter) {
    case 'today':
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      return gte(schema.clips.createdAt, startOfToday);
    case 'thisWeek':
      const startOfWeek = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - now.getDay(),
      );
      return gte(schema.clips.createdAt, startOfWeek);
    case 'thisMonth':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return gte(schema.clips.createdAt, startOfMonth);
    default:
      return undefined;
  }
};

export const getClip = async (clipId: string, userId?: string) => {
  const result = await db
    .select({
      clips: schema.clips,
      users: schema.users,
      hermitcraftChannels: schema.hermitcraftChannels,
      likesCount: sql<number>`cast(count(${schema.likes.clip}) as int)`.as(
        'likes_count',
      ),
    })
    .from(schema.clips)
    .where(eq(schema.clips.id, clipId))
    .leftJoin(schema.users, eq(schema.clips.user, schema.users.id))
    .leftJoin(
      schema.hermitcraftChannels,
      eq(schema.clips.hermit, schema.hermitcraftChannels.ChannelID),
    )
    .leftJoin(schema.likes, eq(schema.clips.id, schema.likes.clip))
    .groupBy(
      schema.clips.id,
      schema.users.id,
      schema.hermitcraftChannels.ChannelID,
    );

  const parsedFields = await Promise.all(
    result.map(async ({ clips, users, hermitcraftChannels, likesCount }) => ({
      ...clips,
      user: users,
      hermit: hermitcraftChannels,
      start: parseFloat(clips.start),
      end: parseFloat(clips.end),
      liked: userId ? await hasLikedClip(userId, clips.id) : false,
      likes: likesCount,
    })),
  );

  return parsedFields[0];
};

interface GetAllClipsParams {
  userId: string;
  filterUserId?: string;
  hermitId?: string;
  sort?: string;
  timeFilter?: TimeRange;
  likedOnly?: boolean;
}
export const getAllClips = async ({
  userId,
  filterUserId,
  hermitId,
  sort,
  timeFilter,
  likedOnly,
}: GetAllClipsParams) => {
  const sqlFilters = [
    filterUserId ? eq(schema.clips.user, filterUserId) : undefined,
    hermitId ? eq(schema.clips.hermit, hermitId) : undefined,
    timeFilter ? getTimeFilter(timeFilter) : undefined,
    likedOnly && userId
      ? sql`EXISTS (
      SELECT 1 FROM ${schema.likes}
      WHERE ${schema.likes.clip} = ${schema.clips.id}
      AND ${schema.likes.user} = ${userId}
    )`
      : undefined,
  ].filter(Boolean);

  const sortFxn = (sort: string) => {
    switch (sort) {
      case 'newest':
        return sql`${schema.clips.createdAt} DESC`;
      case 'most_liked':
        return sql`cast(count(${schema.likes.clip}) as int) DESC`;
      case 'most_downloaded':
        return sql`${schema.clips.downloads} DESC`;
      default:
        return sql`${schema.clips.id} DESC`;
    }
  };

  const result = await db
    .select({
      clips: schema.clips,
      users: schema.users,
      hermitcraftChannels: schema.hermitcraftChannels,
      likesCount: sql<number>`cast(count(${schema.likes.clip}) as int)`.as(
        'likes_count',
      ),
    })
    .from(schema.clips)
    .where(and(...sqlFilters))
    .leftJoin(schema.users, eq(schema.clips.user, schema.users.id))
    .leftJoin(
      schema.hermitcraftChannels,
      eq(schema.clips.hermit, schema.hermitcraftChannels.ChannelID),
    )
    .leftJoin(schema.likes, eq(schema.clips.id, schema.likes.clip))
    .groupBy(
      schema.clips.id,
      schema.users.id,
      schema.hermitcraftChannels.ChannelID,
    )
    .orderBy(sort ? sortFxn(sort) : sql`${schema.clips.id} DESC`);

  const parsedFields = await Promise.all(
    result.map(async ({ clips, users, hermitcraftChannels, likesCount }) => ({
      ...clips,
      user: users,
      hermit: hermitcraftChannels,
      start: parseFloat(clips.start),
      end: parseFloat(clips.end),
      liked: userId ? await hasLikedClip(userId, clips.id) : false,
      likes: likesCount,
    })),
  );

  return parsedFields;
};

interface GetPaginatedClipsParams {
  userId: string;
  filterUserId?: string;
  hermitId?: string;
  sort?: string;
  page?: number;
  limit?: number;
  timeFilter?: TimeRange;
  likedOnly?: boolean;
}
export const getPaginatedClips = async ({
  userId,
  filterUserId,
  hermitId,
  sort,
  page = 1,
  limit = 24,
  timeFilter,
  likedOnly,
}: GetPaginatedClipsParams) => {
  const sqlFilters = [
    filterUserId ? eq(schema.clips.user, filterUserId) : undefined,
    hermitId ? eq(schema.clips.hermit, hermitId) : undefined,
    timeFilter ? getTimeFilter(timeFilter) : undefined,
    likedOnly && userId
      ? sql`EXISTS (
      SELECT 1 FROM ${schema.likes}
      WHERE ${schema.likes.clip} = ${schema.clips.id}
      AND ${schema.likes.user} = ${userId}
    )`
      : undefined,
  ].filter(Boolean);

  const sortFxn = (sort: string) => {
    switch (sort) {
      case 'newest':
        return sql`${schema.clips.createdAt} DESC`;
      case 'most_liked':
        return sql`cast(count(${schema.likes.clip}) as int) DESC`;
      case 'most_downloaded':
        return sql`${schema.clips.downloads} DESC`;
      default:
        return sql`${schema.clips.id} DESC`;
    }
  };

  const offset = (page - 1) * limit;

  const [result, totalCountResult] = await Promise.all([
    db
      .select({
        clips: schema.clips,
        users: schema.users,
        hermitcraftChannels: schema.hermitcraftChannels,
        likesCount: sql<number>`cast(count(${schema.likes.clip}) as int)`.as(
          'likes_count',
        ),
      })
      .from(schema.clips)
      .where(and(...sqlFilters))
      .leftJoin(schema.users, eq(schema.clips.user, schema.users.id))
      .leftJoin(
        schema.hermitcraftChannels,
        eq(schema.clips.hermit, schema.hermitcraftChannels.ChannelID),
      )
      .leftJoin(schema.likes, eq(schema.clips.id, schema.likes.clip))
      .groupBy(
        schema.clips.id,
        schema.users.id,
        schema.hermitcraftChannels.ChannelID,
      )
      .orderBy(sort ? sortFxn(sort) : sql`${schema.clips.id} DESC`)
      .offset(offset)
      .limit(limit),
    db
      .select({
        count: sql<number>`count(*)`.as('count'),
      })
      .from(schema.clips)
      .where(and(...sqlFilters)),
  ]);

  const parsedFields = await Promise.all(
    result.map(async ({ clips, users, hermitcraftChannels, likesCount }) => ({
      ...clips,
      user: users,
      hermit: hermitcraftChannels,
      start: parseFloat(clips.start),
      end: parseFloat(clips.end),
      liked: userId ? await hasLikedClip(userId, clips.id) : false,
      likes: likesCount,
    })),
  );

  const totalCount = totalCountResult[0].count;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    clips: parsedFields,
    totalPages,
  };
};

export type Clip = typeof schema.clips.$inferInsert;
export type DrizzleUser = typeof schema.users.$inferSelect;
export type Like = typeof schema.likes.$inferInsert;

export const saveClip = async (clip: Clip) => {
  const result = await db.insert(schema.clips).values(clip);
  return result;
};
export const editClip = async (newClipValues: EditClipSchema) => {
  const result = await db
    .update(schema.clips)
    .set(newClipValues)
    .where(eq(schema.clips.id, newClipValues.id));
  return result;
};
export const deleteClip = async (clipId: string) => {
  const result = await db
    .delete(schema.clips)
    .where(eq(schema.clips.id, clipId));
  return result;
};

export type Hermit = typeof schema.hermitcraftChannels.$inferInsert;

export const getHermitcraftChannels = async () => {
  const result = await db.query.hermitcraftChannels.findMany();
  return result;
};
export const saveHermit = async (hermit: Hermit) => {
  const result = await db.insert(schema.hermitcraftChannels).values(hermit);
  return result;
};

export const likeClip = async (like: Like) => {
  const result = await db
    .insert(schema.likes)
    .values(like)
    .onConflictDoNothing({
      target: [schema.likes.user, schema.likes.clip],
    });
  return result;
};
export const unlikeClip = async (like: Like) => {
  const result = await db
    .delete(schema.likes)
    .where(
      and(eq(schema.likes.user, like.user), eq(schema.likes.clip, like.clip)),
    );
  return result;
};

export const incrementClipDownloads = async (clipId: string) => {
  const result = await db
    .update(schema.clips)
    .set({
      downloads: sql`${schema.clips.downloads} + 1`,
    })
    .where(eq(schema.clips.id, clipId));
  return result;
};
