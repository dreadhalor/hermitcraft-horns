'use client';

import React from 'react';
import { HornPreview } from './horn-preview';
import { Button } from '@/components/ui/button';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { useCreateAndSaveClip } from '@/hooks/use-create-and-save-clip';

export const PreviewPane = () => {
  const { tagline, hermit, clipStart, clipEnd, videoUrl, playerRef } =
    useClipBuilder();
  const {
    createAndSaveClip,
    isLoading: isSaving,
    error: saveError,
    clipUrl,
  } = useCreateAndSaveClip();

  const handleExport = async () => {
    if (playerRef.current) {
      const duration = playerRef.current.getDuration();
      if (clipEnd <= duration) {
        console.log(`Exporting video from ${clipStart}s to ${clipEnd}s`);
        await createAndSaveClip({
          videoUrl,
          start: clipStart,
          end: clipEnd,
        });
      } else {
        console.error('End time exceeds video duration');
      }
    }
  };

  return (
    <div className='flex h-full flex-col items-center justify-center px-4'>
      <HornPreview />
      {clipUrl && <p>Clip URL: {clipUrl}</p>}
      {saveError && <p>Error saving clip: {saveError.message}</p>}
    </div>
  );
};
