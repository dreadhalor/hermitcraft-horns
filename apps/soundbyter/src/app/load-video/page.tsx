'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { VideoPlaySlider } from './video-play-slider';
import { ClipSlider } from './clip-slider';

const LoadVideoPage = () => {
  const [inputValue, setInputValue] = useState('');
  const [videoUrl, setVideoUrl] = useState(
    'https://www.youtube.com/watch?v=3gjdYKIUO_4',
  );
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const playerRef = useRef<ReactPlayer>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [playTime, setPlayTime] = useState(0);

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
      player.seekTo(startTime);
      player.getInternalPlayer().playVideo();

      const loopInterval = setInterval(() => {
        if (player.getCurrentTime() >= endTime) {
          player.seekTo(startTime);
          player.getInternalPlayer().playVideo();
        }
      }, 100);

      return () => {
        clearInterval(loopInterval);
      };
    }
  }, [isLooping, startTime, endTime]);

  const handleExport = async () => {
    if (playerRef.current) {
      const duration = playerRef.current.getDuration();
      if (endTime <= duration) {
        // TODO: Implement the export functionality
        console.log(`Exporting video from ${startTime}s to ${endTime}s`);
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
                onReady={() => {
                  console.log('Player ready');
                  setPlayerReady(true);
                }}
                className='h-full max-h-full w-full max-w-full'
              />
            )}
          </div>
          <div className='flex flex-col px-2 pt-4'>
            {/* the elapsed time slider */}
            <VideoPlaySlider
              playerRef={playerRef}
              playTime={playTime}
              setPlayTime={setPlayTime}
              playerReady={playerReady}
            />
            {/* the clip trimming slider */}
            <ClipSlider
              playerRef={playerRef}
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
              playerReady={playerReady}
            />
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
