import './env-config';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

export const db = drizzle(sql, { schema });

export const getUsers = async () => {
  const result = await db.query.users.findMany();
  console.log('result', result);
  return result;
};

export const getClips = async () => {
  const result = await db.query.clips.findMany();
  console.log('result', result);
  return result;
};

export type Clip = typeof schema.clips.$inferInsert;

export const saveClip = async (clip: Clip) => {
  console.log('clip', clip);
  const result = await db.insert(schema.clips).values(clip);
  console.log('result', result);
  return result;
};
