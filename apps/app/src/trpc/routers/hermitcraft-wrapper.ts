import { z } from 'zod';
import { publicProcedure } from '../trpc';
import { Hermit } from '@drizzle/db';

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
    const response = await fetch(
      `https://hermitcraft.com/api/videos?type=${type}${member ? `&member=${member}` : ''}&start=${start}`,
    );
    if (!response.ok) {
      throw new Error('Failed to fetch video data');
    }

    const result = await response.json();
    return result as GetVideosApiResponse;
  });
