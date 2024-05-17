'use client';

import JoeHills from '@/assets/hermits/joehills.jpeg';
import { useEffect, useRef, useState } from 'react';
import { cn, getYouTubeId } from '@/lib/utils';
import Image from 'next/image';
import { HornTileMenu } from './horn-tile-menu';
import { useRouter } from 'next/navigation';
import { Horn } from '@/trpc';

type HornTileProps = {
  horn: Horn;
  className?: string;
  onClick?: () => void;
};

export const HornTile = ({ horn, className, onClick }: HornTileProps) => {
  const { tagline, clipUrl, season, user, hermit, start, end } = horn;
  const { username } = user ?? {};
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  const profilePic = hermit?.ProfilePicture || JoeHills.src;

  const handlePlayClick = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
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
      <HornTileBorder audioRef={audioRef} />
      {clipUrl && <audio ref={audioRef} src={clipUrl} />}
      <div
        className='absolute inset-0 flex items-center justify-center p-[4px] brightness-[60%]'
        onClick={onClick ? onClick : handlePlayClick}
      >
        <div className='relative h-full w-full overflow-hidden rounded-md'>
          <Image src={profilePic} alt='profile pic' fill />
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
            <button
              className='pointer-events-auto cursor-pointer text-center hover:underline'
              onClick={() => {
                router.push(
                  `/create?id=${getYouTubeId(horn.video)}&start=${start}&end=${end}`,
                );
              }}
            >
              View clip &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

type HornTileBorderProps = {
  audioRef: React.RefObject<HTMLAudioElement>;
};

const HornTileBorder = ({ audioRef }: HornTileBorderProps) => {
  const tileRef = useRef<HTMLDivElement | null>(null);
  const [percentage, setPercentage] = useState(0);
  const animationFrameRef = useRef<number | null>(null);

  const createArcPath = (percentage: number) => {
    const tile = tileRef.current;
    if (!tile) return '';

    const radius = Math.max(tile.offsetWidth, tile.offsetHeight) * 2;
    const centerX = tile.offsetWidth / 2;
    const centerY = tile.offsetHeight / 2;

    const startAngle = -90;
    const endAngle = (percentage / 100) * 360 - 90;

    const startX = centerX + radius * Math.cos(startAngle * (Math.PI / 180));
    const startY = centerY + radius * Math.sin(startAngle * (Math.PI / 180));
    const endX = centerX + radius * Math.cos(endAngle * (Math.PI / 180));
    const endY = centerY + radius * Math.sin(endAngle * (Math.PI / 180));

    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    const d = cn(
      `M ${centerX} ${centerY}`,
      `L ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `L ${centerX} ${centerY}`,
    );

    return d;
  };

  useEffect(() => {
    const audio = audioRef.current;
    const tile = tileRef.current;

    const animate = () => {
      if (audio && tile && !audio.paused) {
        const progress = audio.currentTime / audio.duration;
        setPercentage(progress * 100);
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    const handlePlay = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const handlePause = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setPercentage(0);
    };

    const handleEnded = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setPercentage(0);
    };

    if (audio) {
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
    }

    return () => {
      if (audio) {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioRef]);

  return (
    <div
      ref={tileRef}
      className={cn(
        'pointer-events-none absolute inset-0 rounded-lg border-white',
        percentage > 0 && 'border-2',
      )}
      style={{
        clipPath: `path('${createArcPath(percentage)}')`,
      }}
    />
  );
};
