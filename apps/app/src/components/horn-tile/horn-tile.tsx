'use client';

import JoeHills from '@/assets/hermits/joehills.jpeg';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { cn, getYouTubeId } from '@/lib/utils';
import Image from 'next/image';
import { HornTileMenu } from './horn-tile-menu';
import { useRouter } from 'next/navigation';
import { Horn } from '@/trpc';
import HornTileBorder from './horn-tile-border';
import { useInView } from '@/hooks/use-in-view';
import { Howl } from 'howler';
import { useHowlerProgress } from '@/hooks/use-howler-progress';

type HornTileProps = {
  horn: Horn;
  className?: string;
  onClick?: () => void;
  ref?: React.ForwardedRef<{
    togglePlayback: () => void;
  }>;
};

export const HornTile = forwardRef<
  { togglePlayback: () => void },
  HornTileProps
>(({ horn, className, onClick }, ref) => {
  const { tagline, clipUrl, season, user, hermit, start, end, video } = horn!;
  const { username } = user ?? {};
  const [isLoading, setIsLoading] = useState(true); // Track loading state
  const [isPlaying, setIsPlaying] = useState(false); // Track playing state
  const tileRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(tileRef); // Use the hook to check if in view
  const router = useRouter();

  const profilePic = hermit?.ProfilePicture || JoeHills.src;
  const [howl, setHowl] = useState<Howl | null>(null);
  const { playbackProgress, setPlaybackProgress, updatePlaybackProgress } =
    useHowlerProgress(howl);

  useEffect(() => {
    const newHowl = new Howl({
      src: [clipUrl ?? ''],
      preload: true,
      onload: () => {
        setIsLoading(false);
      },
      onplay: () => {
        setIsPlaying(true);
        updatePlaybackProgress(); // Start tracking playback progress
      },
      onpause: () => {
        setIsPlaying(false);
        setPlaybackProgress(0); // Reset playback progress on pause
      },
      onend: () => {
        setIsPlaying(false);
        setPlaybackProgress(0); // Reset playback progress on end
      },
    });

    setHowl(newHowl);

    return () => {
      newHowl.unload();
    };
  }, [clipUrl]);

  useEffect(() => {
    if (isInView && howl) {
      howl.load();
    }
  }, [isInView, howl]);

  const handlePlayClick = () => {
    if (howl) {
      if (!isPlaying) {
        howl.play();
      } else {
        howl.stop(); // Stop the Howl instance to reset the playhead
        setIsPlaying(false); // Ensure isPlaying state is updated
        setPlaybackProgress(0); // Reset playback progress to 0
      }
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      togglePlayback: handlePlayClick,
    }),
    [howl, isPlaying],
  );

  return (
    <div
      ref={tileRef}
      className={cn(
        'relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg bg-[#354B87] text-[12px] text-white',
        className,
      )}
    >
      <HornTileBorder progress={playbackProgress} color='white' />
      <div
        className='absolute inset-0 flex items-center justify-center p-[4px] brightness-[60%]'
        onClick={onClick ? onClick : handlePlayClick}
      >
        {isLoading ? (
          <div className='spinner'>Loading...</div>
        ) : (
          <div className='relative h-full w-full overflow-hidden rounded-md'>
            <Image src={profilePic} alt='profile pic' fill />
          </div>
        )}
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
                  `/create?id=${getYouTubeId(video)}&start=${start}&end=${end}`,
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
});
