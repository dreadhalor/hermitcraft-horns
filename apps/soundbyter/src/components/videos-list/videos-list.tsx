import { trpcServer } from '@/trpc/server';
import React from 'react';
import { VideoListItem } from './video-list-item';
import { Card } from '@/components/ui/card';

export const VideosList = async () => {
  const videos = await trpcServer.getHermitcraftVideos({
    type: 'All',
    start: new Date().toISOString(),
  });
  return (
    <Card className='flex w-full flex-col gap-[10px] overflow-hidden rounded-lg border-none bg-[#4665BA] p-[20px]'>
      <span className='text-white'>Latest</span>
      <div className='flex flex-col gap-2 rounded-[5px] bg-white p-2'>
        {videos.map((video) => (
          <VideoListItem key={video.id} video={video} />
        ))}
      </div>
    </Card>
  );
};
