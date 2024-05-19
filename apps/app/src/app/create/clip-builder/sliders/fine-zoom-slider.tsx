import React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn, formatDuration, formatTime } from '@/lib/utils';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { VideoPlaySlider } from './video-play-slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ui/tooltip';

export const FineZoomSlider = () => {
  const {
    zoomStart,
    fineZoomStart,
    setFineZoomStart,
    zoomEnd,
    fineZoomEnd,
    setFineZoomEnd,
    clipStart,
    clipEnd,
  } = useClipBuilder();

  const zoomRange = zoomEnd - zoomStart;

  const clipStartRelative = (clipStart - zoomStart) / zoomRange;
  const clipEndRelative = (clipEnd - zoomStart) / zoomRange;

  const [sliderActive, setSliderActive] = React.useState(false);
  const [leftThumbFocused, setLeftThumbFocused] = React.useState(false);
  const [rightThumbFocused, setRightThumbFocused] = React.useState(false);

  return (
    <div className='mt-2 flex flex-col'>
      <span className='mb-1 text-sm leading-4'>
        Fine Zoom: {formatDuration(fineZoomEnd - fineZoomStart)} [
        {formatTime(fineZoomStart)} - {formatTime(fineZoomEnd)}]
      </span>
      <VideoPlaySlider min={zoomStart} max={zoomEnd} />
      <SliderPrimitive.Root
        className={cn(
          'relative flex w-full touch-none select-none items-center',
        )}
        min={zoomStart}
        max={zoomEnd}
        value={[fineZoomStart, fineZoomEnd]}
        onValueChange={(value) => {
          setFineZoomStart(value[0]);
          setFineZoomEnd(value[1]);
        }}
        step={100}
        onPointerDown={() => setSliderActive(true)}
        onPointerUp={() => setSliderActive(false)}
      >
        <SliderPrimitive.Track className='relative h-5 w-full grow border-x-[3px] border-[#262673] bg-[hsl(240,60%,60%)]'>
          <SliderPrimitive.Range className='absolute h-full bg-[hsl(240,55%,50%)]' />
          <SliderPrimitive.Range asChild>
            <div
              className='absolute inset-y-0 bg-[hsl(0,50%,50%)]'
              style={{
                left: `${clipStartRelative * 100}%`,
                right: `${(1 - clipEndRelative) * 100}%`,
              }}
            ></div>
          </SliderPrimitive.Range>
          <Tooltip open={leftThumbFocused && sliderActive}>
            <TooltipTrigger asChild>
              <SliderPrimitive.Thumb
                asChild
                onFocus={() => setLeftThumbFocused(true)}
                onBlur={() => setLeftThumbFocused(false)}
              >
                <div
                  className={cn(
                    'z-10 mt-[10px] h-6 w-[5px] -translate-y-1/2 transform select-none border-y-[2px] border-[hsl(240,50%,35%)] shadow-md',
                    'border-l-[3px]',
                  )}
                />
              </SliderPrimitive.Thumb>
            </TooltipTrigger>
            <TooltipContent>
              <p>{formatTime(fineZoomStart)}</p>
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
                    'z-10 mt-[10px] h-6 w-[5px] -translate-y-1/2 transform select-none border-y-[2px] border-[hsl(240,50%,35%)] shadow-md',
                    'border-r-[3px]',
                  )}
                />
              </SliderPrimitive.Thumb>
            </TooltipTrigger>
            <TooltipContent>
              <p>{formatTime(fineZoomEnd)}</p>
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
