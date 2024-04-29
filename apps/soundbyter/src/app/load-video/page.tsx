'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';

const LoadVideoPage = () => {
  const [inputValue, setInputValue] = useState('');
  const [videoUrl, setVideoUrl] = useState(
    'https://www.youtube.com/watch?v=3gjdYKIUO_4&t=13s'
  );
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const playerRef = useRef<ReactPlayer>(null);

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
          <ReactPlayer url={videoUrl} controls ref={playerRef} />
          <div className='pt-4'>
            <Slider
              min={0}
              max={playerRef.current?.getDuration() || 0}
              value={[startTime, endTime]}
              onValueChange={(value) => {
                setStartTime(value[0]);
                setEndTime(value[1]);
              }}
            />
          </div>
          <div>
            <Label>Start Time (in seconds):</Label>
            <Input
              className='text-black'
              type='number'
              value={startTime}
              onChange={(e) => setStartTime(parseFloat(e.target.value))}
              step='0.1'
            />
          </div>
          <div>
            <Label>End Time (in seconds):</Label>
            <Input
              className='text-black'
              type='number'
              value={endTime}
              onChange={(e) => setEndTime(parseFloat(e.target.value))}
              step='0.1'
            />
          </div>
          <Button onClick={handleLoopToggle}>
            {isLooping ? 'Stop Loop' : 'Loop Selected Portion'}
          </Button>
          <Button onClick={handleExport}>Export</Button>
        </div>
      )}
    </div>
  );
};

export default LoadVideoPage;
