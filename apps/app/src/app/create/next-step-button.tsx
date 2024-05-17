'use client';
import { Button } from '@ui/button';
import { useCreateAndSaveClip } from '@/hooks/use-create-and-save-clip';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { useHHUser } from '@/providers/user-provider';
import React from 'react';
import { MAX_CLIP_LENGTH } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const NextStepButton = ({ activeTab, setActiveTab }: Props) => {
  const { clipStart, clipEnd, videoUrl, playerRef, hermit, tagline, season } =
    useClipBuilder();
  const { createAndSaveClip, isLoading: isSaving } = useCreateAndSaveClip();
  const { user } = useHHUser();

  const clipLength = (clipEnd - clipStart) / 1000;

  const getErrorMessage = () => {
    if (!user) return 'Sign in to generate horn!';
    if (!videoUrl) return 'No video selected!';
    if (activeTab === 'clip-builder') {
      if (clipLength > MAX_CLIP_LENGTH) return 'Max clip length 15s!';
      if (clipLength < 0.1) return 'No clip selected!';
    }
    if (activeTab === 'metadata') {
      if (!hermit) return 'Select a Hermit!';
    }

    return '';
  };
  const isErrored = getErrorMessage() !== '';

  const handleExport = async () => {
    if (playerRef.current) {
      const duration = playerRef.current.getDuration() * 1000;
      if (clipEnd <= duration) {
        console.log(
          `Exporting video from ${(clipStart / 1000).toFixed(1)}s to ${(clipEnd / 1000).toFixed(1)}s`,
        );
        toast(
          `Generating horn... please wait! This could take up to a minute, depending on traffic - please don't close the tab. 🐐`,
          { duration: 20000 },
        );
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
          type='button'
          onClick={handleNext}
          disabled={isErrored || isSaving}
        >
          {isErrored ? getErrorMessage() : <>Next &rarr;</>}
        </Button>
      ) : (
        <Button
          type='button'
          onClick={handleExport}
          disabled={isErrored || isSaving}
          className='font-bold'
        >
          {isErrored
            ? getErrorMessage()
            : isSaving
              ? 'Generating...'
              : 'Generate Horn'}
        </Button>
      )}
    </div>
  );
};
