'use client';

import { HermitcraftVideo } from '@/trpc/routers/hermitcraft-wrapper';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React from 'react';

interface Props {
  video: HermitcraftVideo;
}
export const VideoListItem = ({ video }: Props) => {
  const router = useRouter();

  return (
    <div
      className='flex w-full cursor-pointer gap-[5px] bg-white text-xs'
      onClick={() => router.push(`/create?id=${video.id}`)}
    >
      <div className='relative flex aspect-video h-[88px]'>
        <Image
          height={88}
          width={176}
          src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
          alt={`thumbnail for: ${video.title}`}
        />
        <span className='absolute bottom-1 right-1 rounded-[4px] bg-black bg-opacity-60 px-1 py-0.5 text-[10px] font-bold text-white'>
          {video.friendlyDuration}
        </span>
      </div>
      <div className='flex w-full max-w-full flex-col justify-between'>
        <span
          className='line-clamp-4'
          style={{
            wordBreak: 'break-word',
          }}
        >
          {video.title}
        </span>
        <div className='flex w-full gap-2'>
          <span
            className='line-clamp-1'
            style={{
              wordBreak: 'break-word',
            }}
          >
            {video.uploader.DisplayName}
          </span>
          <span className='text-muted-foreground'>
            {video.uploadedFriendlyMobile}
          </span>
        </div>
      </div>
    </div>
  );
};
