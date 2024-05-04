import './env-config';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';
import { InferSelectModel, eq } from 'drizzle-orm';

export const db = drizzle(sql, { schema });

export const getUsers = async () => {
  const result = await db.query.users.findMany();
  return result;
};

export const getClips = async (userId?: string) => {
  const result = await db
    .select()
    .from(schema.clips)
    .where(userId ? eq(schema.clips.user, userId) : undefined)
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

  const parsedFields = nestedFields.map((clip) => ({
    ...clip,
    start: parseFloat(clip.start),
    end: parseFloat(clip.end),
  }));

  return parsedFields;
};

export type Clip = typeof schema.clips.$inferInsert;
export type DrizzleUser = typeof schema.users.$inferSelect;
export type DrizzleClip = (typeof getClips extends () => Promise<infer T>
  ? T
  : never)[number];

export const saveClip = async (clip: Clip) => {
  const result = await db.insert(schema.clips).values(clip);
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
