'use client';

import React, { useRef } from 'react';
import { useWavesurfer } from '@wavesurfer/react';

const formatTime = (seconds: number) => {
  // format to the ms, as this is the precision of the currentTime
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${ms
    .toString()
    .padStart(3, '0')}`;
};

const Page = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { wavesurfer, isPlaying, currentTime } = useWavesurfer({
    container: containerRef,
    height: 200,
    waveColor: 'violet',
    progressColor: 'purple',
    url: 'wels.mp3',
  });

  const togglePlayPause = () => {
    wavesurfer && wavesurfer.playPause();
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (wavesurfer) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const width = bounds.width;
      const percentage = x / width;
      wavesurfer.seekTo(percentage);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-screen'>
      <div className='mb-4'>
        <button
          className='px-4 py-2 bg-blue-500 text-white rounded'
          onClick={togglePlayPause}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
      <div
        className='w-full max-w-md relative'
        ref={containerRef}
        onClick={handleSeek}
      />
      <div className='flex justify-between text-sm text-gray-600 mt-2'>
        <div>{formatTime(currentTime)}</div>
      </div>
    </div>
  );
};

export default Page;
