import React, { useEffect } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn, formatTime } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useApp } from '@/providers/app-provider';
import { VideoPlaySlider } from './video-play-slider';

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
  const ref = React.useRef<HTMLDivElement>(null);

  const clipStartRelative = duration ? clipStart / duration : 0;
  const clipEndRelative = duration ? clipEnd / duration : 0;

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
      >
        <SliderPrimitive.Track
          ref={ref}
          className='relative h-5 w-full grow bg-primary/20'
        >
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

          <SliderPrimitive.Thumb asChild>
            <div
              className={cn(
                'z-10 mt-[10px] h-6 w-[5px] -translate-y-1/2 transform select-none border-y-[2px] border-[hsl(240,50%,35%)] shadow-md',
                'border-l-[3px]',
              )}
            />
          </SliderPrimitive.Thumb>
          <SliderPrimitive.Thumb asChild>
            <div
              className={cn(
                'z-10 mt-[10px] h-6 w-[5px] -translate-y-1/2 transform select-none border-y-[2px] border-[hsl(240,50%,35%)] shadow-md',
                'border-r-[3px]',
              )}
            />
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Track>
      </SliderPrimitive.Root>
      <span className='flex items-center justify-between text-sm leading-4'>
        <span>{formatTime(0)}</span>
        <span>{formatTime(duration)}</span>
      </span>
    </div>
  );
};
