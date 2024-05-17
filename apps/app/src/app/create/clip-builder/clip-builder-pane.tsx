'use client';

import { Button } from '@ui/button';
import React, { useState, useEffect } from 'react';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { ClipSlider } from './sliders/clip-slider';
import { ZoomSlider } from './sliders/zoom-slider';
import { formatTime } from '@/lib/utils';

export const ClipBuilderPane = () => {
  const {
    clipStart,
    clipEnd,
    duration,
    playerRef,
    playTime,
    setPlayTime,
    playing,
  } = useClipBuilder();
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
        <div className='my-2 grid w-full grid-cols-6 gap-2'>
          <Button
            type='button'
            onClick={() => {
              if (playerRef.current) {
                const newTime = Math.max(
                  playerRef.current.getCurrentTime() - 5,
                  0,
                );
                playerRef.current.seekTo(newTime);
                setPlayTime(newTime);
                if (playing) {
                  playerRef.current.getInternalPlayer().playVideo();
                }
              }
            }}
          >
            &larr;5s
          </Button>
          <Button
            type='button'
            className='col-span-2'
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
          <Button
            type='button'
            onClick={handleLoopToggle}
            className='col-span-2'
          >
            {isLooping ? 'Stop Loop' : 'Loop Clip'}
          </Button>
          <Button
            type='button'
            onClick={() => {
              if (playerRef.current) {
                const newTime = Math.min(
                  playerRef.current.getCurrentTime() + 5,
                  playerRef.current.getDuration(),
                );
                playerRef.current.seekTo(newTime);
                setPlayTime(newTime);
                if (playing) {
                  playerRef.current.getInternalPlayer().playVideo();
                }
              }
            }}
          >
            5s&rarr;
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
