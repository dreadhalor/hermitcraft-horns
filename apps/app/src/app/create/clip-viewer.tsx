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
    setZoomStart,
    setZoomEnd,
    setFineZoomStart,
    setFineZoomEnd,
    setPlayTime,
  } = useClipBuilder();

  const initZoomMargin = 5000;

  useEffect(() => {
    if (playerRef?.current && playerReady) {
      const duration = playerRef.current.getDuration() * 1000;
      setDuration(duration);
      if (initialClipStart !== undefined) {
        setClipStart(initialClipStart);
        const initZoomStart = Math.max(0, initialClipStart - initZoomMargin);
        setZoomStart(initZoomStart);
        setFineZoomStart(initZoomStart);
        setPlayTime(initialClipStart / 1000);
      } else {
        setClipStart(0);
        setZoomStart(0);
        setFineZoomStart(0);
        setPlayTime(0);
      }
      if (initialClipEnd !== undefined) {
        setClipEnd(initialClipEnd);
        const initZoomEnd = Math.min(initialClipEnd + initZoomMargin, duration);
        setZoomEnd(initZoomEnd);
        setFineZoomEnd(initZoomEnd);
      } else {
        setClipEnd(0);
        setZoomEnd(duration);
        setFineZoomEnd(duration);
      }
    }
  }, [playerRef, playerReady]);

  useEffect(() => {
    setPlayerReady(false);
  }, [videoUrl]);

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
                  setPlayerReady(() => true);
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
