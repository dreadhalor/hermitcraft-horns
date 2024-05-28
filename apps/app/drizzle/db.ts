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
  searchTerm?: string;
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
  searchTerm,
}: GetPaginatedClipsParams) => {
  console.log('searchTerm', searchTerm);
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
    searchTerm
      ? sql`similarity(${schema.clips.tagline}, ${searchTerm}) > 0.1`
      : undefined,
  ].filter(Boolean);

  const sortFxn = (sort: string | undefined, searchTerm?: string) => {
    if (searchTerm) {
      return sql`similarity(${schema.clips.tagline}, ${searchTerm}) DESC`;
    }

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
      .orderBy(sortFxn(sort, searchTerm))
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

  const totalCount = totalCountResult[0]!.count;
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

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export const updateHermitcraftCache = async () => {
  try {
    console.log('Updating cache');
    // format date as 2024-04-26T14:10:10Z
    const url = `https://hermitcraft.com/api/videos?type=All&start=${new Date().toISOString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // I'm so sorry I crashed your server Hypno, I promise I'll never do it again :(
        // & I'm also sorry for lying about the user-agent now, but good job on upping your security
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch video data');
    }
    const data = await response.json();

    // make sure the update is atomic
    await db.transaction(async (trx) => {
      await trx.delete(schema.cachedHermitcraftVideos); // Clear old cache
      await trx.insert(schema.cachedHermitcraftVideos).values({
        data,
        updatedAt: new Date(),
      });
    });

    return data;
  } catch (error) {
    console.error('Error updating cache:', error);
    return []; // gracefully fail
  }
};

export const getCachedHermitcraftVideos = async () => {
  const cachedResult = await db
    .select()
    .from(schema.cachedHermitcraftVideos)
    .orderBy(sql`${schema.cachedHermitcraftVideos.updatedAt} DESC`)
    .limit(1);

  if (cachedResult.length > 0) {
    const now = new Date();
    const lastUpdate = new Date(cachedResult[0]!.updatedAt);
    const age = now.getTime() - lastUpdate.getTime();

    if (age < CACHE_DURATION) {
      // seeeeee we're returning cached data, plz don't be mad at me Hypno
      return cachedResult[0]!.data;
    }
  }

  // but if cache is old or empty, we'll update it
  return await updateHermitcraftCache();
};
