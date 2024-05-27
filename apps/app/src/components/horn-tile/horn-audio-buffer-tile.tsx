'use client';

import JoeHills from '@/assets/hermits/joehills.jpeg';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { HornTileMenu } from './horn-tile-menu';
import { HHUser } from '@/trpc';
import { Hermit } from '@drizzle/db';

type HornAudioBufferHorn = {
  tagline?: string;
  hermit: Hermit;
  season?: string;
  user: HHUser;
  audioBuffer: AudioBuffer | null;
};
type HornAudioBufferTileProps = {
  horn: HornAudioBufferHorn;
  className?: string;
  onClick?: () => void;
  ref?: React.ForwardedRef<{
    togglePlayback: () => void;
  }>;
};

export const HornAudioBufferTile = forwardRef<
  { togglePlayback: () => void },
  HornAudioBufferTileProps
>(({ horn, className, onClick }, ref) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const { tagline, season, user, hermit, audioBuffer } = horn;
  const { username } = user ?? {};
  const profilePic = hermit?.ProfilePicture || JoeHills.src;

  const updateProgress = () => {
    if (audioBuffer && audioContextRef.current) {
      const elapsed = audioContextRef.current.currentTime;
      const newProgress = (elapsed / audioBuffer.duration) * 100;
      setProgress(newProgress);
      requestAnimationFrame(updateProgress);
    }
  };

  const handlePlayClick = () => {
    if (!audioBuffer) return;

    if (isPlaying) {
      sourceNode?.stop();
      setIsPlaying(false);
      setProgress(0);
      audioContextRef.current = null; // Reset the audio context
    } else {
      const newAudioContext = new AudioContext();
      const source = newAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(newAudioContext.destination);
      source.start();
      audioContextRef.current = newAudioContext;
      setSourceNode(source);
      setIsPlaying(true);

      source.onended = () => {
        setIsPlaying(false);
        setSourceNode(null);
        setProgress(0);
        audioContextRef.current = null; // Reset the audio context
      };

      requestAnimationFrame(updateProgress);
    }
  };

  useEffect(() => {
    return () => {
      if (sourceNode) {
        sourceNode.stop();
      }
    };
  }, [sourceNode]);

  useImperativeHandle(
    ref,
    () => ({
      togglePlayback: handlePlayClick,
    }),
    [handlePlayClick],
  );

  return (
    <div
      className={cn(
        'relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg bg-[#354B87] text-[12px] text-white',
        className,
      )}
    >
      <HornTileBorder progress={progress} />
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
            <HornTileMenu horn={horn as any} disabled />
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
});

type HornTileBorderProps = {
  progress: number;
};

const HornTileBorder = ({ progress }: HornTileBorderProps) => {
  const tileRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div
      ref={tileRef}
      className={cn(
        'pointer-events-none absolute inset-0 rounded-lg border-white',
        progress > 0 && 'border-2',
      )}
      style={{
        clipPath: `path('${createArcPath(progress)}')`,
      }}
    />
  );
};
