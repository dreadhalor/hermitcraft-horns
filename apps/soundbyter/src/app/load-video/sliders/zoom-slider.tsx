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
export const ZoomSlider = ({ playerRef, playerReady }: Props) => {
  const [videoDuration, setVideoDuration] = React.useState(0);
  const { zoomStart, setZoomStart, zoomEnd, setZoomEnd } = useApp();

  useEffect(() => {
    if (playerRef.current) {
      setVideoDuration(playerRef.current.getDuration());
      setZoomEnd(playerRef.current.getDuration());
    }
  }, [playerRef, playerReady, setZoomEnd]);

  return (
    <>
      <Label className='mb-1'>Zoom</Label>
      <SliderPrimitive.Root
        className={cn(
          'relative flex w-full touch-none select-none items-center',
          'pb-2',
        )}
        min={0}
        max={videoDuration || 0}
        value={[zoomStart, zoomEnd]}
        onValueChange={(value) => {
          setZoomStart(value[0]);
          setZoomEnd(value[1]);
        }}
      >
        <SliderPrimitive.Track className='relative h-4 w-full grow overflow-hidden rounded-full bg-primary/20'>
          <SliderPrimitive.Range className='absolute h-full bg-[hsl(240,50,50)]' />
        </SliderPrimitive.Track>
      </SliderPrimitive.Root>
    </>
  );
};
