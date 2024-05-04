'use client';

import { HornTile } from '@/components/horn-tile';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { useUser } from '@clerk/nextjs';
import React from 'react';

export const HornPreview = () => {
  const { tagline, hermit, season, playClip } = useClipBuilder();
  const { user } = useUser();

  return (
    <div className='flex flex-col items-center'>
      <span className='text-lg font-bold'>Preview:</span>
      <HornTile
        horn={
          {
            tagline,
            profilePic: hermit?.ProfilePicture,
            season,
            user: {
              username: 'Joe Hills',
            },
          } as any
        }
        className='aspect-square w-[150px]'
        onClick={playClip}
      />
    </div>
  );
};
