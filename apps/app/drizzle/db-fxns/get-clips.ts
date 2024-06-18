import { TimeRange } from '@/lib/utils';
import * as schema from '../schema';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db, hasLikedClip } from '@drizzle/db';

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
