'use client';

import React from 'react';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { useHHUser } from '@/providers/user-provider';
import { Button } from '@ui/button';
import { FaPlay } from 'react-icons/fa6';
import { useAudioContext } from '@repo/audio-editor';
import { HornAudioBufferTile } from '@/components/horn-tile/horn-audio-buffer-tile';

export const ConfirmHornFinal = () => {
  const { tagline, hermit, season, setActiveTab } = useClipBuilder();
  const { audioBuffer } = useAudioContext();
  const { user } = useHHUser();
  const hornRef = React.useRef<any>(null);

  const playHorn = async () => {
    if (hornRef.current) {
      hornRef.current.togglePlayback();
    }
  };

  return (
    <div className='flex h-full w-full items-center justify-center px-4'>
      <div className='grid grid-cols-1 gap-6'>
        <span className='text-center text-lg font-bold'>Final check!</span>
        <HornAudioBufferTile
          ref={hornRef}
          horn={{
            tagline,
            hermit: hermit!,
            season,
            user,
            audioBuffer,
          }}
          className='mx-auto mb-1 aspect-square max-w-[250px]'
        />
        <div className='grid grid-cols-2 gap-2'>
          <Button
            type='button'
            className='w-full'
            onClick={() => setActiveTab('audio-editor')}
          >
            &larr; Go back
          </Button>
          <Button type='button' className='w-full' onClick={playHorn}>
            <FaPlay className='mr-2' />
            Play
          </Button>
        </div>
      </div>
    </div>
  );
};
