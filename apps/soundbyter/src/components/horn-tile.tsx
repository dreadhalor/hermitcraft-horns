'use client';
import { Horn } from './horns-list';
import JoeHills from '@/assets/hermits/joehills.jpeg';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { FaRegHeart } from 'react-icons/fa';
import { MdFileDownload } from 'react-icons/md';

type HornTileProps = {
  horn: Horn;
  className?: string;
};

export const HornTile = ({
  horn: { tagline, profilePic, clipUrl, season },
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
        'relative aspect-square w-full overflow-hidden rounded-lg bg-[#354B87] text-[12px] text-white',
        className,
      )}
      onClick={handlePlayClick}
    >
      {clipUrl && <audio ref={audioRef} src={clipUrl} />}
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
          <div className='flex justify-between'>
            <span className='text-[10px]'>dreadhalor</span>
            <div className='grid grid-cols-2 items-center justify-items-end p-0'>
              <span>53</span> <FaRegHeart />
              <span>101</span> <MdFileDownload />
            </div>
          </div>
          <span className='my-auto text-center font-bold'>{tagline}</span>
          <div className='flex justify-center'>
            {season && <span className='mr-auto text-center'>S{season}</span>}
            <span className='text-center'>View clip &rarr;</span>
          </div>
        </div>
      </div>
    </div>
  );
};
