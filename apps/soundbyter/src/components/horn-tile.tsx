'use client';
import Image from 'next/image';
import { Horn } from './horns-list';
import JoeHills from '@/assets/hermits/joehills.jpeg';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type HornTileProps = {
  horn: Horn;
  className?: string;
};

export const HornTile = ({
  horn: { tagline, profilePic, clipUrl },
  className,
}: HornTileProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayClick = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [clipUrl]);

  return (
    <div
      className={cn(
        'relative aspect-square w-full overflow-hidden rounded-lg bg-[#354B87] text-white',
        className,
      )}
      onClick={handlePlayClick}
    >
      <audio ref={audioRef} src={clipUrl} />
      <div className='absolute inset-0 flex items-center justify-center p-[4px] brightness-[60%]'>
        <div className='relative h-full w-full overflow-hidden rounded-md'>
          {/* so tired of image origin shenanigans, Next.js */}
          {/* <Image
            src={profilePic ?? JoeHills}
            alt='profile pic'
            fill
            className='object-contain'
          /> */}
          <img
            src={profilePic ?? JoeHills.src}
            alt='profile pic'
            className='absolute inset-0 h-full w-full object-fill'
          />
        </div>
      </div>
      <div className='absolute inset-0 p-[8px]'>
        <div className='flex h-full w-full flex-col p-[4px]'>
          <div className='flex items-center'>
            <span className='text-[10px]'>dreadhalor</span>
          </div>
          <span className='my-auto text-center text-[12px]'>{tagline}</span>
          <span className='text-center text-[12px]'>View clip &rarr;</span>
        </div>
      </div>
    </div>
  );
};
