'use client';

import { Button } from '@ui/button';
import React, { useState, useEffect } from 'react';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { ClipSlider } from './sliders/clip-slider';
import { ZoomSlider } from './sliders/zoom-slider';
import { formatTime } from '@/lib/utils';

export const ClipBuilderPane = () => {
  const { clipStart, clipEnd, duration, playerRef, playTime, playing } =
    useClipBuilder();
  const [isLooping, setIsLooping] = useState(false);

  const handleLoopToggle = () => {
    setIsLooping(!isLooping);
  };

  useEffect(() => {
    if (isLooping && playerRef.current) {
      const player = playerRef.current;
      player.seekTo(clipStart / 1000);
      player.getInternalPlayer().playVideo();

      const loopInterval = setInterval(() => {
        if (player.getCurrentTime() * 1000 >= clipEnd) {
          player.seekTo(clipStart / 1000);
          player.getInternalPlayer().playVideo();
        }
      }, 50);

      return () => {
        clearInterval(loopInterval);
      };
    }
  }, [isLooping, clipStart, clipEnd]);

  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-1 flex-col px-4 pt-4'>
        <span className='text-sm'>
          {playing ? 'Playing' : 'Paused'}:&nbsp;
          {formatTime(playTime * 1000, 'seconds')}
          &nbsp;/&nbsp;
          {formatTime(duration)}
        </span>
        <div className='grid w-full grid-cols-2 gap-2'>
          <Button
            className='my-2'
            onClick={() => {
              if (playerRef.current) {
                if (playing) {
                  playerRef.current.getInternalPlayer().pauseVideo();
                } else {
                  playerRef.current.getInternalPlayer().playVideo();
                }
              }
            }}
          >
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button onClick={handleLoopToggle} className='my-2'>
            {isLooping ? 'Stop Loop' : 'Loop Clip'}
          </Button>
        </div>
        <div className='flex flex-col gap-2'>
          <ZoomSlider />
          <ClipSlider />
        </div>
      </div>
    </div>
  );
};
