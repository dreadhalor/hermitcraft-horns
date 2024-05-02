import React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn, formatTime } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useApp } from '@/providers/app-provider';

export const ClipSlider2 = () => {
  const { zoomStart, zoomEnd, clipStart, setClipStart, clipEnd, setClipEnd } =
    useApp();

  return (
    <div className='flex flex-col gap-1'>
      <Label>
        Clip: {formatTime(clipStart)} &rarr; {formatTime(clipEnd)} (
        {clipEnd - clipStart} seconds)
      </Label>
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
      >
        <SliderPrimitive.Track className='relative h-5 w-full grow border-x-[3px] border-[#262673] bg-[hsl(240,50%,50%)]'>
          <SliderPrimitive.Range className='absolute h-full bg-[hsl(0,50%,50%)]' />
          <SliderPrimitive.Thumb asChild>
            <div
              className={cn(
                'z-10 mt-[10px] h-6 w-[5px] -translate-y-1/2 transform select-none border-y-[2px] border-[hsl(0,50%,35%)] shadow-md',
                'border-l-[3px]',
              )}
            />
          </SliderPrimitive.Thumb>
          <SliderPrimitive.Thumb asChild>
            <div
              className={cn(
                'z-10 mt-[10px] h-6 w-[5px] -translate-y-1/2 transform select-none border-y-[2px] border-[hsl(0,50%,35%)] shadow-md',
                'border-r-[3px]',
              )}
            />
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Track>
      </SliderPrimitive.Root>
      <span className='flex items-center justify-between text-sm leading-4'>
        <span>{formatTime(zoomStart)}</span>
        <span>{formatTime(zoomEnd)}</span>
      </span>
    </div>
  );
};
