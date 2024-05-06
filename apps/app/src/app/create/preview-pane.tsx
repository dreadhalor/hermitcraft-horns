'use client';

import React from 'react';
import { HornPreview } from './horn-preview';
import { Button } from '@ui/button';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { useCreateAndSaveClip } from '@/hooks/use-create-and-save-clip';

export const PreviewPane = () => {
  const { playClip } = useClipBuilder();
  const { error: saveError, clipUrl } = useCreateAndSaveClip();

  return (
    <div className='flex h-full w-full items-center justify-center px-4'>
      <div className='grid grid-cols-1 gap-1'>
        <HornPreview />
        <Button className='w-full' onClick={playClip}>
          Play
        </Button>
        {clipUrl && <p>Clip URL: {clipUrl}</p>}
        {saveError && <p>Error saving clip: {saveError.message}</p>}
      </div>
    </div>
  );
};
