import { z } from 'zod';
import { publicProcedure } from '../trpc';
import { Hermit, getCachedHermitcraftVideos } from '@drizzle/db';

export interface HermitcraftVideo {
  id: string;
  uploaded: string;
  uploadedFriendly: string;
  uploadedFriendlyMobile: string;
  uploader: Hermit;
  title: string;
  duration: number;
  friendlyDuration: string;
  likeCount: number;
  viewCount: number;
  commentCount: number;
}

type GetHermitChannelsApiResponse = Hermit[];
type GetVideosApiResponse = HermitcraftVideo[];

// must run this serverside to avoid a CORS error
export const getHermitChannels = publicProcedure
  .output(z.custom<GetHermitChannelsApiResponse>())
  .query(async () => {
    const response = await fetch('https://hermitcraft.com/api/hermit');
    if (!response.ok) {
      throw new Error('Failed to fetch channel data');
    }

    const result = await response.json();

    return result as GetHermitChannelsApiResponse;
  });

export const getHermitcraftVideos = publicProcedure
  .input(
    z.object({
      type: z.string(),
      start: z.string(),
      member: z.string().optional(),
    }),
  )
  .output(z.custom<GetVideosApiResponse>())
  .query(async ({ input: { type, start, member } }) => {
    try {
      const data = await getCachedHermitcraftVideos();
      return data as GetVideosApiResponse;
    } catch (error) {
      throw new Error('Failed to fetch video data (hermitcraft-wrapper)');
    }
  });
