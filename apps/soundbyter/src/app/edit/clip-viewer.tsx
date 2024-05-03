'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from './clip-builder/navbar';
import ReactPlayer from 'react-player';
import { useClipBuilder } from '@/providers/clip-builder-provider';

export const ClipViewer = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [playerReady, setPlayerReady] = useState(false);

  const { videoUrl, playerRef, setDuration, setPlaying } = useClipBuilder();

  useEffect(() => {
    if (playerRef.current) {
      setDuration(playerRef.current.getDuration());
    }
  }, [playerRef, playerReady]);

  return (
    <>
      <Navbar />
      {/* weird that we need a wrapping div here but ReactPlayer needs a display:block wrapper to properly size */}
      <div>
        <div className='flex aspect-video w-full items-center justify-center'>
          {isClient &&
            (videoUrl ? (
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
            ) : (
              <div className='text-center text-lg text-gray-500'>
                No video selected
              </div>
            ))}
        </div>
      </div>
    </>
  );
};
