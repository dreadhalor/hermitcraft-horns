import React, { useEffect } from 'react';
import ReactPlayer from 'react-player';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn, formatTime } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface Props {
  playerRef: React.MutableRefObject<ReactPlayer | null>;
  startTime: number;
  setStartTime: (value: number) => void;
  endTime: number;
  setEndTime: (value: number) => void;
  playerReady: boolean;
}
export const ClipSlider = ({
  playerRef,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  playerReady,
}: Props) => {
  const [videoDuration, setVideoDuration] = React.useState(0);
  useEffect(() => {
    if (playerRef.current) {
      setVideoDuration(playerRef.current.getDuration());
    }
  }, [playerRef, playerReady]);

  return (
    <>
      <Label className='mb-1'>
        Clip: {formatTime(startTime)} &rarr; {formatTime(endTime)} (
        {endTime - startTime} seconds)
      </Label>
      <SliderPrimitive.Root
        className={cn(
          'relative flex w-full touch-none select-none items-center',
          'pb-2',
        )}
        min={0}
        max={videoDuration || 0}
        value={[startTime, endTime]}
        onValueChange={(value) => {
          setStartTime(value[0]);
          setEndTime(value[1]);
        }}
      >
        <SliderPrimitive.Track className='relative h-4 w-full grow overflow-hidden rounded-full bg-primary/20'>
          <SliderPrimitive.Range className='absolute h-full bg-[hsl(0,50,50)]' />
        </SliderPrimitive.Track>
      </SliderPrimitive.Root>
    </>
  );
};
