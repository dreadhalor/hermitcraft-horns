'use client';
import { Button } from '@ui/button';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { useHHUser } from '@/providers/user-provider';
import React, { useEffect } from 'react';
import { MAX_CLIP_LENGTH } from '@/lib/utils';
import { toast } from 'sonner';
import { useGenerateClip } from '@/hooks/use-generate-clip';
import { usePublishDraft } from '@/hooks/use-publish-draft';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const NextStepButton = ({ activeTab, setActiveTab }: Props) => {
  const { clipStart, clipEnd, videoUrl, playerRef, hermit, setFile } =
    useClipBuilder();
  const { file, generateClip, isLoading: isGenerating } = useGenerateClip();
  const { publishDraft, isLoading: isPublishing } = usePublishDraft();
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
        await generateClip({ videoUrl, start: clipStart, end: clipEnd });
      } else {
        console.error('End time exceeds video duration');
      }
    }
  };

  const handleNext = async () => {
    switch (activeTab) {
      case 'clip-builder':
        setActiveTab('metadata');
        break;
      case 'metadata':
        handleExport();
        break;
      case 'horn-confirm':
        await publishDraft({
          file: file!,
          start: clipStart,
          end: clipEnd,
          videoUrl,
          userId: user!.id,
          hermitId: hermit!.ChannelID!,
        });
        break;
    }
  };

  useEffect(() => {
    if (file) {
      setFile(file);
      setActiveTab('horn-confirm');
    }
  }, [file]);

  const getButtonText = () => {
    if (isErrored) return getErrorMessage();
    if (isGenerating) return 'Generating...';
    switch (activeTab) {
      case 'clip-builder':
        return 'Next →';
      case 'metadata':
        if (file) return 'Re-Generate Draft →';
        return 'Generate Draft →';
      case 'horn-confirm':
        if (isPublishing) return 'Publishing...';
        return 'Publish Horn!';
      default:
        return 'Next →';
    }
  };

  return (
    <div className='flex w-full items-center gap-2'>
      <Button
        className='flex-1'
        type='button'
        onClick={handleNext}
        disabled={isErrored || isGenerating || isPublishing}
      >
        {getButtonText()}
      </Button>
    </div>
  );
};
