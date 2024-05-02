'use client';

import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { useApp } from '@/providers/app-provider';
import { useCreateAndSaveClip } from '@/hooks/use-create-and-save-clip';
import { ClipSlider } from './sliders/clip-slider';
import { ZoomSlider } from './sliders/zoom-slider';
import { formatTime } from '@/lib/utils';
import { Navbar } from './navbar';

export const ClipBuilderPane = () => {
  const [videoUrl, setVideoUrl] = useState(
    'https://www.youtube.com/watch?v=IM-Z6hJb4E4',
  );
  const {
    clipStart,
    clipEnd,
    duration,
    setDuration,
    playerRef,
    playTime,
    playing,
    setPlaying,
  } = useApp();
  const [isLooping, setIsLooping] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    if (playerRef.current) {
      setDuration(playerRef.current.getDuration());
    }
  }, [playerRef, playerReady]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLoopToggle = () => {
    setIsLooping(!isLooping);
  };

  useEffect(() => {
    if (isLooping && playerRef.current) {
      const player = playerRef.current;
      player.seekTo(clipStart);
      player.getInternalPlayer().playVideo();

      const loopInterval = setInterval(() => {
        if (player.getCurrentTime() >= clipEnd) {
          player.seekTo(clipStart);
          player.getInternalPlayer().playVideo();
        }
      }, 100);

      return () => {
        clearInterval(loopInterval);
      };
    }
  }, [isLooping, clipStart, clipEnd]);

  const {
    createAndSaveClip,
    isLoading: isSaving,
    error: saveError,
    clipUrl,
  } = useCreateAndSaveClip();

  const handleExport = async () => {
    if (playerRef.current) {
      const duration = playerRef.current.getDuration();
      if (clipEnd <= duration) {
        console.log(`Exporting video from ${clipStart}s to ${clipEnd}s`);
        await createAndSaveClip({
          videoUrl,
          start: clipStart,
          end: clipEnd,
        });
      } else {
        console.error('End time exceeds video duration');
      }
    }
  };

  return (
    <div className='flex h-full flex-col'>
      <Navbar videoUrl={videoUrl} setVideoUrl={setVideoUrl} />
      {videoUrl && (
        <div className='flex flex-1 flex-col'>
          {/* weird that we need a wrapping div here but ReactPlayer needs a display:block wrapper to properly size */}
          <div>
            <div className='flex aspect-video w-full items-center justify-center'>
              {isClient && (
                <ReactPlayer
                  url={videoUrl}
                  ref={playerRef}
                  controls
                  onReady={() => {
                    console.log('Player ready');
                    setPlayerReady(true);
                  }}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  className='h-full max-h-full w-full max-w-full'
                />
              )}
            </div>
          </div>
          <div className='flex flex-1 flex-col px-4 pt-4'>
            <span className='text-sm'>
              {playing ? 'Playing' : 'Paused'}: {formatTime(playTime)} /{' '}
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

            <Button className='mb-4 mt-auto'>Next</Button>
            {/* <Button
              onClick={handleExport}
              disabled={isSaving}
              className='mb-4 mt-auto'
            >
              {isSaving ? 'Saving...' : 'Export'}
            </Button> */}
            {/* {clipUrl && <p>Clip URL: {clipUrl}</p>}
            {saveError && <p>Error saving clip: {saveError.message}</p>} */}
          </div>
        </div>
      )}
    </div>
  );
};
