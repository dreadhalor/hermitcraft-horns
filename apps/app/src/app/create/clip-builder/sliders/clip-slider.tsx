import React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn, formatDuration, formatTime } from '@/lib/utils';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { VideoPlaySlider } from './video-play-slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ui/tooltip';

export const ClipSlider = () => {
  const {
    getClipZoomRange,
    clipStart,
    setClipStart,
    clipEnd,
    setClipEnd,
    usingFineZoom,
  } = useClipBuilder();

  const [sliderActive, setSliderActive] = React.useState(false);
  const [leftThumbFocused, setLeftThumbFocused] = React.useState(false);
  const [rightThumbFocused, setRightThumbFocused] = React.useState(false);

  const [zoomStart, zoomEnd] = getClipZoomRange();

  return (
    <div className='flex flex-col'>
      <span className='mb-1 text-sm leading-4'>
        Clip: {formatDuration(clipEnd ?? 0 - (clipStart ?? 0))} (
        {formatTime(clipStart ?? 0)}
        &nbsp;&rarr;&nbsp;
        {formatTime(clipEnd ?? 0)})
      </span>
      <VideoPlaySlider min={zoomStart} max={zoomEnd} />
      <SliderPrimitive.Root
        className={cn(
          'relative flex w-full touch-none select-none items-center',
        )}
        min={zoomStart}
        max={zoomEnd}
        value={[
          Math.max(clipStart ?? 0, zoomStart),
          Math.min(clipEnd ?? zoomEnd, zoomEnd),
        ]}
        onValueChange={(value) => {
          const [start, end] = value;
          setClipStart(start);
          setClipEnd(end);
        }}
        step={usingFineZoom ? 50 : 100}
        onPointerDown={() => setSliderActive(true)}
        onPointerUp={() => setSliderActive(false)}
      >
        <SliderPrimitive.Track
          className={cn(
            'relative h-5 w-full grow border-x-[3px] border-[#262673]',
            usingFineZoom ? 'bg-[hsl(240,55%,50%)]' : 'bg-[hsl(240,60%,60%)]',
          )}
        >
          <SliderPrimitive.Range className='absolute h-full bg-[hsl(0,50%,50%)]' />
          <Tooltip open={leftThumbFocused && sliderActive}>
            <TooltipTrigger asChild>
              <SliderPrimitive.Thumb
                asChild
                onFocus={() => setLeftThumbFocused(true)}
                onBlur={() => setLeftThumbFocused(false)}
              >
                <div
                  className={cn(
                    'z-10 mt-[10px] h-6 w-[5px] -translate-y-1/2 transform select-none border-y-[2px] border-[hsl(0,50%,35%)] shadow-md',
                    'border-l-[3px]',
                  )}
                />
              </SliderPrimitive.Thumb>
            </TooltipTrigger>
            <TooltipContent>
              <p>{formatTime(clipStart ?? 0)}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip open={rightThumbFocused && sliderActive}>
            <TooltipTrigger asChild>
              <SliderPrimitive.Thumb
                asChild
                onFocus={() => setRightThumbFocused(true)}
                onBlur={() => setRightThumbFocused(false)}
              >
                <div
                  className={cn(
                    'z-10 mt-[10px] h-6 w-[5px] -translate-y-1/2 transform select-none border-y-[2px] border-[hsl(0,50%,35%)] shadow-md',
                    'border-r-[3px]',
                  )}
                />
              </SliderPrimitive.Thumb>
            </TooltipTrigger>
            <TooltipContent>
              <p>{formatTime(clipEnd ?? 0)}</p>
            </TooltipContent>
          </Tooltip>
        </SliderPrimitive.Track>
      </SliderPrimitive.Root>
      <span className='mt-0.5 flex items-center justify-between text-sm leading-4'>
        <span>{formatTime(zoomStart)}</span>
        <span>{formatTime(zoomEnd)}</span>
      </span>
    </div>
  );
};
