import React, { useEffect } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn, formatTime } from '@/lib/utils';
import { useApp } from '@/providers/app-provider';
import { VideoPlaySlider } from './video-play-slider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const ZoomSlider = () => {
  const {
    zoomStart,
    setZoomStart,
    zoomEnd,
    setZoomEnd,
    duration,
    clipStart,
    clipEnd,
  } = useApp();

  const clipStartRelative = duration ? clipStart / duration : 0;
  const clipEndRelative = duration ? clipEnd / duration : 0;

  const [sliderActive, setSliderActive] = React.useState(false);
  const [leftThumbFocused, setLeftThumbFocused] = React.useState(false);
  const [rightThumbFocused, setRightThumbFocused] = React.useState(false);

  useEffect(() => {
    setZoomEnd(duration);
  }, [duration, setZoomEnd]);

  return (
    <div className='flex flex-col'>
      <span className='mb-1 text-sm leading-4'>
        Zoom: [{formatTime(zoomStart)} - {formatTime(zoomEnd)}]
      </span>
      <VideoPlaySlider min={0} max={duration} />
      <SliderPrimitive.Root
        className={cn(
          'relative flex w-full touch-none select-none items-center',
        )}
        min={0}
        max={duration || 0}
        value={[zoomStart, zoomEnd]}
        onValueChange={(value) => {
          setZoomStart(value[0]);
          setZoomEnd(value[1]);
        }}
        onPointerDown={() => setSliderActive(true)}
        onPointerUp={() => setSliderActive(false)}
      >
        <SliderPrimitive.Track className='relative h-5 w-full grow bg-primary/20'>
          <SliderPrimitive.Range className='absolute h-full bg-[hsl(240,50%,50%)]' />
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
              <p>{formatTime(zoomStart)}</p>
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
              <p>{formatTime(zoomEnd)}</p>
            </TooltipContent>
          </Tooltip>
        </SliderPrimitive.Track>
      </SliderPrimitive.Root>
      <span className='mt-0.5 flex items-center justify-between text-sm leading-4'>
        <span>{formatTime(0)}</span>
        <span>{formatTime(duration)}</span>
      </span>
    </div>
  );
};
