'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from './clip-builder/navbar';
import ReactPlayer from 'react-player';
import { useClipBuilder } from '@/providers/clip-builder-provider';

type Props = {
  initialClipStart?: number;
  initialClipEnd?: number;
};

export const ClipViewer = ({ initialClipStart, initialClipEnd }: Props) => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [playerReady, setPlayerReady] = useState(false);

  const {
    videoUrl,
    playerRef,
    setDuration,
    setPlaying,
    setClipStart,
    setClipEnd,
    setPlayTime,
  } = useClipBuilder();

  useEffect(() => {
    if (playerRef?.current) {
      setDuration(playerRef.current.getDuration() * 1000);
    }
  }, [playerRef, playerReady]);

  useEffect(() => {
    if (initialClipStart !== undefined) {
      setClipStart(initialClipStart);
      setPlayTime(initialClipStart / 1000);
    }
    if (initialClipEnd !== undefined) {
      setClipEnd(initialClipEnd);
    }
  }, [initialClipStart, initialClipEnd]);

  return (
    <>
      <Navbar />
      {/* weird that we need a wrapping div here but ReactPlayer needs a display:block wrapper to properly size */}
      <div>
        <div className='flex aspect-video w-full items-center justify-center'>
          {isClient &&
            (videoUrl ? (
              <ReactPlayer
                height='100%'
                width='100%'
                url={videoUrl}
                ref={playerRef}
                controls
                onReady={() => {
                  setPlayerReady(true);
                  if (initialClipStart !== undefined) {
                    playerRef.current?.seekTo(initialClipStart / 1000);
                  }
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                config={{
                  youtube: {
                    embedOptions: {
                      host: 'https://www.youtube-nocookie.com',
                    },
                  },
                }}
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
