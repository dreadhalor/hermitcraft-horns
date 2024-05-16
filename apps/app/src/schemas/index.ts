import { Hermit } from '@drizzle/db';
import { z } from 'zod';

export const saveClipSchema = z.object({
  start: z.string(),
  end: z.string(),
  video: z.string(),
  clipUrl: z.string().optional(),
  user: z.string(),
  hermit: z.string().optional(),
  tagline: z.string().optional(),
  season: z.string().optional(),
});
export type SaveClipSchema = z.infer<typeof saveClipSchema>;

export const editClipSchema = z.object({
  id: z.number(),
  tagline: z.string().optional(),
  season: z.string().optional(),
  hermit: z.string().optional(),
});
export type EditClipSchema = z.infer<typeof editClipSchema>;

export const editClipFrontendSchema = z.object({
  id: z.number(),
  tagline: z.string().optional(),
  season: z.string().optional(),
  hermit: z.custom<Hermit | null>(),
});
export type EditClipFrontendSchema = z.infer<typeof editClipFrontendSchema>;

export const usernameStringSchema = z
  .string()
  .min(5, 'Username must be at least 5 characters')
  .max(15, 'Username must be at most 15 characters');
export const usernameSchema = z.object({
  username: usernameStringSchema,
});
export type UsernameSchema = z.infer<typeof usernameSchema>;

export const updateUsernameSchema = z.object({
  userId: z.string(),
  username: usernameSchema.shape.username,
});
