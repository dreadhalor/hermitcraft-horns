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

export const getAllClips = async (userId: string, filterUserId?: string) => {
  const result = await db
    .select()
    .from(schema.clips)
    .where(filterUserId ? eq(schema.clips.user, filterUserId) : undefined)
    .leftJoin(schema.users, eq(schema.clips.user, schema.users.id))
    .leftJoin(
      schema.hermitcraftChannels,
      eq(schema.clips.hermit, schema.hermitcraftChannels.ChannelID),
    );

  const nestedFields = result.map(({ users, clips, hermitcraftChannels }) => ({
    ...clips,
    user: users,
    hermit: hermitcraftChannels,
  }));

  const parsedFields = nestedFields.map(async (clip) => ({
    ...clip,
    start: parseFloat(clip.start),
    end: parseFloat(clip.end),
    liked: userId ? await hasLikedClip(userId, clip.id) : false,
    likes: await countLikes(clip.id),
  }));

  return await Promise.all(parsedFields);
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
