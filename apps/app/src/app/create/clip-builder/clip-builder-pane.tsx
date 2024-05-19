'use client';

import { Button } from '@ui/button';
import React, { useState, useEffect } from 'react';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { ClipSlider } from './sliders/clip-slider';
import { ZoomSlider } from './sliders/zoom-slider';
import { formatTime } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '@ui/accordion';
import { FineZoomSlider } from './sliders/fine-zoom-slider';
import OpenZoomSlider from '@/assets/open-zoom-slider.svg';
import CloseZoomSlider from '@/assets/close-zoom-slider.svg';

export const ClipBuilderPane = () => {
  const {
    clipStart,
    clipEnd,
    duration,
    playerRef,
    playTime,
    setPlayTime,
    playing,
    usingFineZoom,
    setUsingFineZoom,
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

      const intervalLength = 100;

      const loopInterval = setInterval(() => {
        if (player.getCurrentTime() * 1000 >= clipEnd - intervalLength) {
          player.seekTo(clipStart / 1000);
          player.getInternalPlayer().playVideo();
        }
      }, intervalLength);

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
          <Accordion
            value={usingFineZoom ? 'fine-zoom' : 'zoom'}
            onValueChange={(value) => {
              setUsingFineZoom(value === 'fine-zoom');
            }}
            type='single'
            collapsible
          >
            <AccordionItem
              value='fine-zoom'
              className='border-0 border-[#4665BA] pb-0 data-[state=open]:border-b'
            >
              <AccordionHeader className='flex items-center gap-1'>
                <ZoomSlider />
                <AccordionTrigger noRotate asChild>
                  <Button
                    variant='outline'
                    className='flex h-8 w-7 shrink-0 items-center justify-center border-0 bg-primary/15 p-0 hover:bg-primary/20'
                  >
                    {usingFineZoom ? (
                      <CloseZoomSlider className='w-5' />
                    ) : (
                      <OpenZoomSlider className='w-5' />
                    )}
                  </Button>
                </AccordionTrigger>
              </AccordionHeader>

              <AccordionContent wrapperClassName='mx-[-14px] px-[14px]'>
                <FineZoomSlider />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className='flex w-full items-center'></div>
          <ClipSlider />
        </div>
      </div>
    </div>
  );
};
