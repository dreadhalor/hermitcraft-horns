import { z } from 'zod';
import { publicProcedure } from '../trpc';

export type Channel = {
  id: number; // this is always 0 for some reason
  ChannelName: string;
  DisplayName: string;
  GooglePlusLink: string;
  ProfilePicture: string;
  TwitterName: string;
  TwitchName: string;
  WebsiteURL: string; // this is always an empty string
  Active: boolean;
  Streaming: boolean;
  YTStreaming: boolean;
  ChannelID: string;
  UploadPlaylistID: string;
};

type ApiResponse = Channel[];

// must run this serverside to avoid a CORS error
export const getHermitChannels = publicProcedure
  .output(z.custom<ApiResponse>())
  .query(async () => {
    const response = await fetch('https://hermitcraft.com/api/hermit');
    if (!response.ok) {
      throw new Error('Failed to fetch channel data');
    }

    const result = await response.json();
    return result as ApiResponse;
  });
