import { db } from '@drizzle/db';
import * as schema from '../schema';
import { count, eq } from 'drizzle-orm';

export const getUserSafe = async (userId: string) => {
  if (!userId) {
    console.log('no userId provided');
    return null;
  }
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  return result[0];
};
export const getUser = async (userId: string) => {
  if (!userId) {
    console.log('no userId provided');
    return null;
  }
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  if (!result.length) {
    console.log('no user found at id:', userId);
    const username = await getNewUsername();
    if (!username) {
      console.log('no available usernames');
      return null;
    }
    return ensureUser(userId, username);
  }
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
export const getNewUsername = async () => {
  // count usernames that are in newUsernames
  const [countDestructure] = await db
    .select({ count: count() })
    .from(schema.newUsernames);
  const availableNameCount = countDestructure!.count;

  if (!availableNameCount) {
    console.log('no available usernames');
    return `user-${Math.floor(Math.random() * 100000)}`;
  }
  const randomIndex = Math.floor(Math.random() * availableNameCount);

  // select random username from newUsernames with randomIndex
  const result = await db
    .select()
    .from(schema.newUsernames)
    .offset(randomIndex)
    .limit(1);
  const { username } = result[0]!;
  return username;
};

export const ensureUser = async (userId: string, username: string) => {
  const user = await getUserSafe(userId);
  if (user) return user;

  await db
    .delete(schema.newUsernames)
    .where(eq(schema.newUsernames.username, username));
  await db.insert(schema.users).values({ id: userId, username });
  const newUser = await getUserSafe(userId);
  return newUser;
};

export const addUsername = async (username: string) => {
  await db.insert(schema.newUsernames).values({ username });
};
