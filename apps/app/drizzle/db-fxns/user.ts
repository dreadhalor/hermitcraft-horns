import { db } from '@drizzle/db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

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
export const getUserByUsername = async (username: string) => {
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username));
  return result[0];
};
export const updateUsername = async (userId: string, username: string) => {
  const result = await db
    .update(schema.users)
    .set({ username })
    .where(eq(schema.users.id, userId));
  return result;
};
