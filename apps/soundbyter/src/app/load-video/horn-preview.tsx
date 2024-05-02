'use client';

import { HornTile } from '@/components/horn-tile';
import { useCreateAndSaveClip } from '@/hooks/use-create-and-save-clip';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import React from 'react';

export const HornPreview = () => {
  const { tagline, hermit, season } = useClipBuilder();

  return (
    <div className='flex flex-col items-center'>
      <span className='text-lg font-bold'>Preview:</span>
      <HornTile
        horn={{
          id: '0',
          title: 'Joe Hills',
          tagline,
          profilePic: hermit?.ProfilePicture,
          season,
        }}
        className='aspect-square w-[150px]'
      />
    </div>
  );
};
