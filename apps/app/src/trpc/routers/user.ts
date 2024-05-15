import { z } from 'zod';
import { publicProcedure } from '../trpc';
import {
  getUser as drizzleGetUser,
  getAllUsers as drizzleGetAllUsers,
  updateUsername as drizzleUpdateUsername,
  getUserByUsername,
} from '@drizzle/db';
import { updateUsernameSchema, usernameSchema } from '@/schemas';

export const getUser = publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
    const result = await drizzleGetUser(input.userId);
    return result || null;
  });

export const getAllUsers = publicProcedure.query(async () => {
  return await drizzleGetAllUsers();
});

export const updateUsername = publicProcedure
  .input(updateUsernameSchema)
  .mutation(async ({ input: { userId, username } }) => {
    await drizzleUpdateUsername(userId, username);
    return true;
  });

export const validateUsername = publicProcedure
  .input(usernameSchema)
  .query(async ({ input: { username } }) => {
    const existingUser = await getUserByUsername(username);
    console.log('existingUser', existingUser);
    return !existingUser;
  });
