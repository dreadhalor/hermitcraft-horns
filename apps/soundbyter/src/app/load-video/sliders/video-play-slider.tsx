import React, { useEffect } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';

interface Props {
  min: number;
  max: number;
}
export const VideoPlaySlider = ({ min, max }: Props) => {
  const {
    playTime,
    setPlayTime,
    playSliderValue,
    setPlaySliderValue,
    playerRef,
    playing,
    currentlySeeking,
    setCurrentlySeeking,
  } = useApp();

  useEffect(() => {
    if (playerRef.current) {
      const player = playerRef.current;
      const interval = setInterval(() => {
        if (!currentlySeeking) {
          setPlayTime(player.getCurrentTime());
          setPlaySliderValue(player.getCurrentTime());
        }
      }, 100);

      return () => {
        clearInterval(interval);
      };
    }
  }, [currentlySeeking, playerRef, setPlayTime, setPlaySliderValue]);

  useEffect(() => {
    if (!currentlySeeking) {
      setPlaySliderValue(playTime);
    }
  }, [playTime, currentlySeeking, setPlaySliderValue]);

  const handlePlaySliderChange = (value: number) => {
    setPlaySliderValue(value);
  };

  const handlePlaySliderValueCommit = (value: number) => {
    setCurrentlySeeking(false);
    if (playerRef.current) {
      playerRef.current.seekTo(value);
      if (playing) {
        playerRef.current.getInternalPlayer().playVideo();
      }
    }
  };

  return (
    <div>
      <SliderPrimitive.Root
        className={cn(
          'relative flex w-full touch-none select-none items-center bg-primary/20',
        )}
        min={min}
        max={max}
        value={[playSliderValue]}
        onValueChange={([val]) => handlePlaySliderChange(val)}
        onValueCommit={([val]) => handlePlaySliderValueCommit(val)}
        onPointerDown={() => setCurrentlySeeking(true)}
      >
        <SliderPrimitive.Track className='relative h-3 w-full grow'>
          <SliderPrimitive.Thumb asChild>
            <svg
              fill='currentColor'
              version='1.1'
              xmlns='http://www.w3.org/2000/svg'
              x='0px'
              y='0px'
              viewBox='0 0 12 6'
              width='20'
              height='10'
            >
              <path d='M0,0l6,6l6-6H0z' />
            </svg>
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Track>
      </SliderPrimitive.Root>
    </div>
  );
};
