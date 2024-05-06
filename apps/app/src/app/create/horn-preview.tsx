'use client';

import { HornPreviewTile } from '@/components/horn-tile/horn-preview-tile';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { useHHUser } from '@/providers/user-provider';
import React from 'react';

export const HornPreview = () => {
  const { tagline, hermit, season, playClip } = useClipBuilder();
  const { user } = useHHUser();

  return (
    <div className='flex flex-col items-center'>
      <span className='text-lg font-bold'>Preview:</span>
      <HornPreviewTile
        horn={
          {
            tagline,
            profilePic: hermit?.ProfilePicture,
            season,
            user: {
              username: user?.username || 'Joe Hills',
            },
          } as any
        }
        className='aspect-square w-[150px]'
        onClick={playClip}
      />
    </div>
  );
};
