'use client';

import { Button } from '@/components/ui/button';
import { useCreateAndSaveClip } from '@/hooks/use-create-and-save-clip';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import React from 'react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}
export const NextStepButton = ({ activeTab, setActiveTab }: Props) => {
  const { clipStart, clipEnd, videoUrl, playerRef } = useClipBuilder();
  const {
    createAndSaveClip,
    isLoading: isSaving,
    error: saveError,
    clipUrl,
  } = useCreateAndSaveClip();

  const handleExport = async () => {
    // if (playerRef.current) {
    //   const duration = playerRef.current.getDuration();
    //   if (clipEnd <= duration) {
    //     console.log(`Exporting video from ${clipStart}s to ${clipEnd}s`);
    //     await createAndSaveClip({
    //       videoUrl,
    //       start: clipStart,
    //       end: clipEnd,
    //     });
    //   } else {
    //     console.error('End time exceeds video duration');
    //   }
    // }
  };

  const handleNext = () => {
    switch (activeTab) {
      case 'clip-builder':
        setActiveTab('metadata');
        break;
      case 'metadata':
        setActiveTab('preview');
        break;
      case 'preview':
        break;
    }
  };

  return (
    <div className='mx-4 mb-4 flex flex-col'>
      {activeTab !== 'preview' ? (
        <Button onClick={handleNext}>Next &rarr;</Button>
      ) : (
        <Button
          onClick={handleExport}
          disabled={isSaving}
          className='font-bold'
        >
          {isSaving ? 'Generating...' : 'Generate Horn'}
        </Button>
      )}
    </div>
  );
};
