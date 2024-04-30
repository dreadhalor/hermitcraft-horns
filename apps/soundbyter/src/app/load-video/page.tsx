'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { VideoPlaySlider } from './sliders/video-play-slider';
import { ClipSlider } from './sliders/clip-slider';
import { CombinedSlider } from './sliders/combined-slider';
import { useApp } from '@/providers/app-provider';
import { Clip } from '@/../drizzle/db';
import { trpc } from '@/trpc/client';

const LoadVideoPage = () => {
  const [inputValue, setInputValue] = useState('');
  const [videoUrl, setVideoUrl] = useState(
    'https://www.youtube.com/watch?v=IM-Z6hJb4E4',
  );
  const { clipStart, clipEnd } = useApp();
  const [isLooping, setIsLooping] = useState(false);
  const playerRef = useRef<ReactPlayer>(null);
  const [playerReady, setPlayerReady] = useState(false);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setVideoUrl(inputValue);
    e.preventDefault();
    // TODO: Validate the video URL if needed
  };

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

  const { mutate, isLoading } = trpc.saveClip.useMutation({
    onSettled: () => {
      console.log('Clip saved');
    },
  });

  const handleExport = async () => {
    if (playerRef.current) {
      const duration = playerRef.current.getDuration();
      if (clipEnd <= duration) {
        // TODO: Implement the export functionality
        console.log(`Exporting video from ${clipStart}s to ${clipEnd}s`);
        // const output: Clip = {
        //   start: `${clipStart}`,
        //   end: `${clipEnd}`,
        //   video: videoUrl,
        // };
        // mutate(output);
      } else {
        console.error('End time exceeds video duration');
      }
    }
  };

  return (
    <div>
      <h1>Load YouTube Video</h1>
      <form onSubmit={handleSubmit}>
        <Input
          type='text'
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder='Enter YouTube video URL'
          className='text-black'
        />
        <Button type='submit'>Load Video</Button>
      </form>
      {videoUrl && (
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
                className='h-full max-h-full w-full max-w-full'
              />
            )}
          </div>
          <div className='flex flex-col px-2 pt-4'>
            <CombinedSlider playerRef={playerRef} playerReady={playerReady} />
            {/* <ZoomSlider playerRef={playerRef} playerReady={playerReady} /> */}
            {/* the elapsed time slider */}
            <VideoPlaySlider playerRef={playerRef} playerReady={playerReady} />
            {/* the clip trimming slider */}
            <ClipSlider playerRef={playerRef} playerReady={playerReady} />
            <Button onClick={handleLoopToggle} className='my-2'>
              {isLooping ? 'Stop Loop' : 'Loop Selected Portion'}
            </Button>
            <Button onClick={handleExport}>Export</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadVideoPage;
