import React, { useEffect } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn, formatTime } from '@/lib/utils';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ui/tooltip';

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
  } = useClipBuilder();

  const [showTooltip, setShowTooltip] = React.useState(false);

  useEffect(() => {
    if (!currentlySeeking) {
      setPlaySliderValue(playTime * 1000);
    }
  }, [playTime]);

  const handlePlaySliderChange = (value: number) => {
    setPlaySliderValue(value);
  };

  const handlePlaySliderValueCommit = (value: number) => {
    setCurrentlySeeking(false);
    if (playerRef.current) {
      playerRef.current.seekTo(value / 1000);
      setPlayTime(value / 1000);
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
        step={1000}
        value={[playSliderValue]}
        onValueChange={([val]) => handlePlaySliderChange(val)}
        onValueCommit={([val]) => handlePlaySliderValueCommit(val)}
        onPointerDown={() => {
          setCurrentlySeeking(true);
          setShowTooltip(true);
        }}
        onPointerUp={() => {
          setShowTooltip(false);
        }}
      >
        <SliderPrimitive.Track className='relative h-3 w-full grow'>
          <Tooltip open={showTooltip}>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent>
              <p>{formatTime(playSliderValue)}</p>
            </TooltipContent>
          </Tooltip>
        </SliderPrimitive.Track>
      </SliderPrimitive.Root>
    </div>
  );
};
