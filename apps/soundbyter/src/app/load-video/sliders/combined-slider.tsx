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
export const CombinedSlider = ({ playerRef, playerReady }: Props) => {
  const [videoDuration, setVideoDuration] = React.useState(0);
  const {
    zoomStart,
    setZoomStart,
    zoomEnd,
    setZoomEnd,
    playSliderValue,
    clipStart,
    clipEnd,
  } = useApp();

  useEffect(() => {
    if (playerRef.current) {
      setVideoDuration(playerRef.current.getDuration());
      setZoomEnd(playerRef.current.getDuration());
    }
  }, [playerRef, playerReady, setZoomEnd]);

  return (
    <>
      <Label className='mb-1'>Zoom</Label>
      <div className='relative w-full border'>
        <SliderPrimitive.Root
          className={cn(
            'relative z-20 flex w-full touch-none select-none items-center',
          )}
          min={0}
          max={videoDuration || 0}
          value={[zoomStart, zoomEnd]}
          onValueChange={(value) => {
            setZoomStart(value[0]);
            setZoomEnd(value[1]);
          }}
        >
          <SliderPrimitive.Track className='relative h-4 w-full grow rounded-full bg-primary/20'>
            <SliderPrimitive.Range className='absolute h-full bg-[hsl(240,50,50)]' />
            <SliderPrimitive.Thumb className='block h-12 w-px rounded-none bg-[hsl(240,50,50)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50' />
            <SliderPrimitive.Thumb className='block h-12 w-px rounded-none bg-[hsl(240,50,50)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50' />
          </SliderPrimitive.Track>
        </SliderPrimitive.Root>
        <SliderPrimitive.Root
          className={cn(
            'pointer-events-none relative flex w-full touch-none select-none items-center',
          )}
          min={0}
          max={videoDuration || 0}
          value={[playSliderValue]}
        >
          <SliderPrimitive.Track className='relative h-4 w-full grow overflow-hidden rounded-full bg-primary/20'>
            <SliderPrimitive.Range className='absolute h-full bg-primary' />
          </SliderPrimitive.Track>
        </SliderPrimitive.Root>
        <SliderPrimitive.Root
          className={cn(
            'relative z-10 flex w-full touch-none select-none items-center',
          )}
          min={0}
          max={videoDuration || 0}
          value={[clipStart, clipEnd]}
        >
          <SliderPrimitive.Track className='relative h-4 w-full grow rounded-full bg-primary/20'>
            <SliderPrimitive.Range className='absolute h-full bg-[hsl(0,50,50)]' />
            <SliderPrimitive.Thumb className='block h-8 w-px -translate-y-1/2 rounded-none bg-[hsl(0,50,50)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50' />
            <SliderPrimitive.Thumb className='block h-8 w-px -translate-y-1/2 rounded-none bg-[hsl(0,50,50)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50' />
          </SliderPrimitive.Track>
        </SliderPrimitive.Root>
      </div>
    </>
  );
};
