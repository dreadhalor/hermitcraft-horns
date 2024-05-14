'use client';
import { Button } from '@ui/button';
import { useCreateAndSaveClip } from '@/hooks/use-create-and-save-clip';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { useHHUser } from '@/providers/user-provider';
import React from 'react';
import { MAX_CLIP_LENGTH } from '@/lib/utils';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const NextStepButton = ({ activeTab, setActiveTab }: Props) => {
  const { clipStart, clipEnd, videoUrl, playerRef, hermit, tagline, season } =
    useClipBuilder();
  const { createAndSaveClip, isLoading: isSaving } = useCreateAndSaveClip();
  const { user } = useHHUser();

  const clipLength = clipEnd - clipStart;

  const handleExport = async () => {
    if (playerRef.current) {
      const duration = playerRef.current.getDuration();
      if (clipEnd <= duration) {
        console.log(`Exporting video from ${clipStart}s to ${clipEnd}s`);
        await createAndSaveClip({
          videoUrl,
          start: clipStart,
          end: clipEnd,
          userId: user?.id || '',
          hermitId: hermit?.ChannelID || '',
          tagline,
          season,
        });
      } else {
        console.error('End time exceeds video duration');
      }
    }
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
    <div className='mb-4 flex w-full flex-col'>
      {activeTab !== 'preview' ? (
        <Button
          onClick={handleNext}
          disabled={clipLength > MAX_CLIP_LENGTH || !user}
        >
          {!user ? (
            'Sign in to generate horn!'
          ) : clipLength > MAX_CLIP_LENGTH ? (
            'Max clip length 15s!'
          ) : (
            <>Next &rarr;</>
          )}
        </Button>
      ) : (
        <Button
          onClick={handleExport}
          disabled={isSaving || !user}
          className='font-bold'
        >
          {user
            ? isSaving
              ? 'Generating...'
              : 'Generate Horn'
            : 'Sign in to generate horn!'}
        </Button>
      )}
    </div>
  );
};
