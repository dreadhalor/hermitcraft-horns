import React, { useEffect } from 'react';
import ReactPlayer from 'react-player';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn, formatTime } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useApp } from '@/providers/app-provider';

interface Props {
  playerRef: React.MutableRefObject<ReactPlayer | null>;
  playerReady: boolean;
}
export const ClipSlider = ({ playerRef, playerReady }: Props) => {
  const [videoDuration, setVideoDuration] = React.useState(0);
  const { zoomStart, zoomEnd, clipStart, setClipStart, clipEnd, setClipEnd } =
    useApp();

  useEffect(() => {
    if (playerRef.current) {
      setVideoDuration(playerRef.current.getDuration());
    }
  }, [playerRef, playerReady]);

  return (
    <>
      <Label className='mb-1'>
        Clip: {formatTime(clipStart)} &rarr; {formatTime(clipEnd)} (
        {clipEnd - clipStart} seconds)
      </Label>
      <SliderPrimitive.Root
        className={cn(
          'relative flex w-full touch-none select-none items-center',
          'pb-2',
        )}
        min={zoomStart}
        max={zoomEnd}
        value={[clipStart, clipEnd]}
        onValueChange={(value) => {
          setClipStart(value[0]);
          setClipEnd(value[1]);
        }}
      >
        <SliderPrimitive.Track className='relative h-4 w-full grow overflow-hidden rounded-full bg-primary/20'>
          <SliderPrimitive.Range className='absolute h-full bg-[hsl(0,50,50)]' />
        </SliderPrimitive.Track>
      </SliderPrimitive.Root>
    </>
  );
};
