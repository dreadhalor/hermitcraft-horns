'use client';

import { HornTile } from '@/components/horn-tile';
import { useApp } from '@/providers/app-provider';
import React from 'react';

export const HornPreview = () => {
  const { tagline, hermit } = useApp();
  return (
    <div className='flex items-center justify-center'>
      <span>Preview (No sound):</span>
      <HornTile
        horn={{
          id: '0',
          title: 'Joe Hills',
          tagline: tagline,
          profilePic: hermit?.ProfilePicture,
        }}
        className='aspect-square w-[150px]'
      />
    </div>
  );
};
