'use client';

import { HornFileTile } from '@/components/horn-tile/horn-file-tile';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { useHHUser } from '@/providers/user-provider';
import React from 'react';
import { Button } from '@ui/button';
import { FaPlay } from 'react-icons/fa6';

interface Props {
  setActiveTab: (tab: string) => void;
}
export const ConfirmHorn = ({ setActiveTab }: Props) => {
  const { tagline, hermit, season, file } = useClipBuilder();
  const { user } = useHHUser();
  const hornRef = React.useRef<any>(null);

  const playHorn = async () => {
    if (hornRef.current) {
      hornRef.current.togglePlayback();
    }
  };

  return (
    <div className='flex h-full w-full items-center justify-center px-4'>
      <div className='grid grid-cols-1 gap-2'>
        <span className='text-lg font-bold'>Congrats, you made a horn!</span>
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
        </div>
      </div>
    </div>
  );
};
