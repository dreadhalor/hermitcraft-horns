'use client';
import JoeHills from '@/assets/hermits/joehills.jpeg';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useHHUser } from '@/providers/user-provider';
import { HornTileMenu } from './horn-tile-menu';

type HornPreviewTileProps = {
  horn: any;
  className?: string;
  onClick?: () => void;
};

export const HornPreviewTile = ({
  horn,
  className,
  onClick,
}: HornPreviewTileProps) => {
  const {
    tagline,
    clipUrl,
    season,
    profilePic = '',
    user: _givenUser,
    hermit,
    liked,
    likes,
    downloads,
  } = horn;
  const { username } = _givenUser ?? {};
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const _profilePic = profilePic || hermit?.ProfilePicture || JoeHills.src;

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
        'relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg bg-[#354B87] text-[12px] text-white',
        className,
      )}
    >
      {clipUrl && <audio ref={audioRef} src={clipUrl} />}
      <div
        className='absolute inset-0 flex items-center justify-center p-[4px] brightness-[60%]'
        onClick={onClick ? onClick : handlePlayClick}
      >
        <div className='relative h-full w-full overflow-hidden rounded-md'>
          <Image src={_profilePic} alt='profile pic' fill />
        </div>
      </div>
      <div className='pointer-events-none absolute inset-0 p-[8px]'>
        <div className='flex h-full w-full flex-col p-[4px]'>
          <div className='flex justify-between'>
            <span className='text-[10px]'>{username ?? 'no user'}</span>
            <HornTileMenu horn={horn} />
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