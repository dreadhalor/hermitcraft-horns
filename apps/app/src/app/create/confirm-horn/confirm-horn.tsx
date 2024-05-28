'use client';

import { HornFileTile } from '@/components/horn-tile/horn-file-tile';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { useHHUser } from '@/providers/user-provider';
import React from 'react';
import { Button } from '@ui/button';
import { FaPlay } from 'react-icons/fa6';

export const ConfirmHorn = () => {
  const {
    tagline,
    hermit,
    season,
    clipStart,
    clipEnd,
    videoUrl,
    file,
    setActiveTab,
    publishDraft,
    isPublishing,
  } = useClipBuilder();
  const { user } = useHHUser();
  const hornRef = React.useRef<any>(null);

  const playHorn = async () => {
    if (hornRef.current) {
      hornRef.current.togglePlayback();
    }
  };

  const handlePublish = async () => {
    if (!file) return;
    await publishDraft({
      file,
      start: clipStart ?? 0,
      end: clipEnd ?? 0,
      videoUrl,
      userId: user!.id,
      hermitId: hermit!.ChannelID!,
      tagline,
      season,
    });
  };

  return (
    <div className='flex h-full w-full items-center justify-center px-4'>
      <div className='grid grid-cols-1 gap-2'>
        <span className='mt-4 text-lg font-bold'>
          Congrats, you made a horn!
        </span>
        <HornFileTile
          ref={hornRef}
          horn={{
            tagline,
            hermit: hermit!,
            season,
            user,
            file,
          }}
          className='mx-auto aspect-square w-[150px]'
        />
        <div className='grid grid-cols-2 gap-2'>
          <Button
            type='button'
            className='w-full'
            onClick={() => setActiveTab('clip-builder')}
          >
            &larr; Try again
          </Button>
          <Button type='button' className='w-full' onClick={playHorn}>
            <FaPlay className='mr-2' />
            Play
          </Button>
          <Button
            type='button'
            className='col-span-2'
            onClick={handlePublish}
            disabled={!file || isPublishing}
          >
            {isPublishing ? 'Publishing...' : '🎉 Publish Horn!'}
          </Button>
        </div>
      </div>
    </div>
  );
};
