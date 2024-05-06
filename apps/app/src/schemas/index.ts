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
