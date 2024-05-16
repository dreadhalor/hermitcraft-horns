import React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn, formatTime } from '@/lib/utils';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { VideoPlaySlider } from './video-play-slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ui/tooltip';

export const ClipSlider = () => {
  const { zoomStart, zoomEnd, clipStart, setClipStart, clipEnd, setClipEnd } =
    useClipBuilder();

  const [sliderActive, setSliderActive] = React.useState(false);
  const [leftThumbFocused, setLeftThumbFocused] = React.useState(false);
  const [rightThumbFocused, setRightThumbFocused] = React.useState(false);

  return (
    <div className='flex flex-col'>
      <span className='mb-1 text-sm leading-4'>
        Clip: {clipEnd - clipStart} seconds ({formatTime(clipStart)}
        &nbsp;&rarr;&nbsp;
        {formatTime(clipEnd)})
      </span>
      <VideoPlaySlider min={zoomStart} max={zoomEnd} />
      <SliderPrimitive.Root
        className={cn(
          'relative flex w-full touch-none select-none items-center',
        )}
        min={zoomStart}
        max={zoomEnd}
        value={[Math.max(clipStart, zoomStart), Math.min(clipEnd, zoomEnd)]}
        onValueChange={(value) => {
          setClipStart(value[0]);
          setClipEnd(value[1]);
        }}
        onPointerDown={() => setSliderActive(true)}
        onPointerUp={() => setSliderActive(false)}
      >
        <SliderPrimitive.Track className='relative h-5 w-full grow border-x-[3px] border-[#262673] bg-[hsl(240,50%,50%)]'>
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
              <p>{formatTime(clipStart)}</p>
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
              <p>{formatTime(clipEnd)}</p>
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
