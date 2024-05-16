import { z } from 'zod';
import { publicProcedure } from '../trpc';
import {
  getUser as drizzleGetUser,
  getAllUsers as drizzleGetAllUsers,
  updateUsername as drizzleUpdateUsername,
  getUserByUsername,
  addUsername as drizzleAddUsername,
} from '@drizzle/db';
import {
  updateUsernameSchema,
  usernameSchema,
  usernameStringSchema,
} from '@/schemas';

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
    return !existingUser;
  });

export const addUsernames = publicProcedure
  .input(z.array(usernameStringSchema))
  .mutation(async ({ input }) => {
    console.log('input', input);
    input.forEach(async (username) => {
      try {
        await drizzleAddUsername(username);
      } catch (e) {
        console.log('error adding username', e);
      }
    });
  });
