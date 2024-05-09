import './env-config';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql as vercelSql } from '@vercel/postgres';
import * as schema from './schema';
import { and, eq, sql } from 'drizzle-orm';
import { EditClipSchema } from '@/schemas';

export const db = drizzle(vercelSql, { schema });

export const getUser = async (userId: string) => {
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  return result[0];
};
export const getAllUsers = async () => {
  const result = await db.select().from(schema.users);
  return result;
};

export const hasLikedClip = async (userId: string, clipId: number) => {
  const result = await db
    .select()
    .from(schema.likes)
    .where(and(eq(schema.likes.user, userId), eq(schema.likes.clip, clipId)))
    .limit(1);

  return result.length > 0;
};
export const countLikes = async (clipId: number) => {
  const result = await db
    .select()
    .from(schema.likes)
    .where(eq(schema.likes.clip, clipId));

  return result.length;
};

interface GetAllClipsParams {
  userId: string;
  filterUserId?: string;
  hermitId?: string;
  sort?: string;
}
export const getAllClips = async ({
  userId,
  filterUserId,
  hermitId,
  sort,
}: GetAllClipsParams) => {
  const filters = [
    filterUserId ? eq(schema.clips.user, filterUserId) : undefined,
    hermitId ? eq(schema.clips.hermit, hermitId) : undefined,
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
    .where(and(...filters))
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

  const parsedFields = result.map(
    async ({ clips, users, hermitcraftChannels, likesCount }) => ({
      ...clips,
      user: users,
      hermit: hermitcraftChannels,
      start: parseFloat(clips.start),
      end: parseFloat(clips.end),
      liked: userId ? await hasLikedClip(userId, clips.id) : false,
      likes: likesCount,
    }),
  );

  return await Promise.all(parsedFields);
};

interface GetPaginatedClipsParams {
  userId: string;
  filterUserId?: string;
  hermitId?: string;
  sort?: string;
  page?: number;
  limit?: number;
}
export const getPaginatedClips = async ({
  userId,
  filterUserId,
  hermitId,
  sort,
  page = 1,
  limit = 20,
}: GetPaginatedClipsParams) => {
  const filters = [
    filterUserId ? eq(schema.clips.user, filterUserId) : undefined,
    hermitId ? eq(schema.clips.hermit, hermitId) : undefined,
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
      .where(and(...filters))
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
    db.select({ count: sql<number>`count(*)`.as('count') }).from(schema.clips),
  ]);

  const parsedFields = result.map(
    async ({ clips, users, hermitcraftChannels, likesCount }) => ({
      ...clips,
      user: users,
      hermit: hermitcraftChannels,
      start: parseFloat(clips.start),
      end: parseFloat(clips.end),
      liked: userId ? await hasLikedClip(userId, clips.id) : false,
      likes: likesCount,
    }),
  );

  const totalCount = totalCountResult[0].count;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    clips: await Promise.all(parsedFields),
    totalPages,
  };
};

export type Clip = typeof schema.clips.$inferInsert;
export type DrizzleUser = typeof schema.users.$inferSelect;
export type DrizzleClip = Awaited<ReturnType<typeof getAllClips>>[number];
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
export const deleteClip = async (clipId: number) => {
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

export const incrementClipDownloads = async (clipId: number) => {
  const result = await db
    .update(schema.clips)
    .set({
      downloads: sql`${schema.clips.downloads} + 1`,
    })
    .where(eq(schema.clips.id, clipId));
  return result;
};
