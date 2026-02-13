'use client';
import { Button } from '@ui/button';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { useHHUser } from '@/providers/user-provider';
import React, { useEffect, useState } from 'react';
import { MAX_CLIP_LENGTH, kebabIt } from '@/lib/utils';
import { toast } from 'sonner';
import { useGenerateClip } from '@/hooks/use-generate-clip';
import { useAudioContext } from '@repo/audio-editor';

const LOADING_MESSAGES = [
  "Summoning the Hermits...",
  "Downloading from the YouTube dimension...",
  "Extracting pure audio essence...",
  "Adding extra hermit-y goodness...",
  "Polishing your horn...",
  "Consulting the Voidlings...",
  "Calibrating the boatem...",
  "Feeding Jellie...",
];

export const NextStepButton = () => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const {
    clipStart,
    clipEnd,
    videoUrl,
    playerRef,
    hermit,
    setFile,
    tagline,
    season,
    activeTab,
    setActiveTab,
    setShowAudioEditor,
    publishDraft,
    isPublishing,
  } = useClipBuilder();
  const { exportFile, exportingFile } = useAudioContext();
  const { file, generateClip, isLoading: isGenerating } = useGenerateClip();
  const { user } = useHHUser();

  const clipLength = ((clipEnd ?? 0) - (clipStart ?? 0)) / 1000;

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
      if (!clipStart || !clipEnd || !user) return;
      const duration = playerRef.current.getDuration() * 1000;
      if ((clipEnd ?? 0) <= duration) {
        console.log(
          `Exporting video from ${(clipStart / 1000).toFixed(1)}s to ${(clipEnd / 1000).toFixed(1)}s`,
        );
        setShowAudioEditor(false);
        await generateClip({
          userId: user.id,
          videoUrl,
          start: clipStart,
          end: clipEnd,
          tagline,
        });
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
        setShowAudioEditor(true);
        setActiveTab('audio-editor');
        break;
      case 'audio-editor':
        setActiveTab('final-confirm');
        break;
      case 'final-confirm':
        if (!clipStart || !clipEnd) return;
        const result = await exportFile();
        if (!result) {
          toast.error('Failed to export audio');
          return;
        }
        const finalFile = new File([result], `${kebabIt(tagline)}.mp3`, {
          type: 'audio/mp3',
        });
        await publishDraft({
          file: finalFile,
          start: clipStart,
          end: clipEnd,
          videoUrl,
          userId: user!.id,
          hermitId: hermit!.ChannelID!,
          tagline,
          season,
        });
        break;
    }
  };

  // Track elapsed time during generation
  useEffect(() => {
    if (!isGenerating) {
      setElapsedTime(0);
      return;
    }
    
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Cycle through loading messages
  useEffect(() => {
    if (!isGenerating) {
      setMessageIndex(0);
      return;
    }
    
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (file) {
      setFile(file);
      setActiveTab('horn-confirm');
    }
  }, [file]);

  const getButtonText = () => {
    if (isErrored) return getErrorMessage();
    if (isGenerating) return `${LOADING_MESSAGES[messageIndex]} (${elapsedTime}s)`;
    switch (activeTab) {
      case 'clip-builder':
        return 'Next →';
      case 'metadata':
        if (file) return 'Re-Generate Draft →';
        return 'Generate Draft →';
      case 'horn-confirm':
        return 'Or: Edit Audio →';
      case 'audio-editor':
        return 'Next →';
      case 'final-confirm':
        if (exportingFile) return 'Exporting...';
        if (isPublishing) return 'Publishing...';
        return '🎉 Publish Horn!';
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
        disabled={isErrored || isGenerating || isPublishing || exportingFile}
      >
        {getButtonText()}
      </Button>
    </div>
  );
};
