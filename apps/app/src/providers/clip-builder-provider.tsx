'use client';

import { useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
import { Hermit } from '@drizzle/db';

type ClipBuilderContextType = {
  zoomStart: number;
  setZoomStart: (value: number) => void;
  zoomEnd: number;
  setZoomEnd: (value: number) => void;
  fineZoomStart: number;
  setFineZoomStart: (value: number) => void;
  fineZoomEnd: number;
  setFineZoomEnd: (value: number) => void;
  usingFineZoom: boolean;
  setUsingFineZoom: (value: boolean) => void;
  getClipZoomRange: () => [number, number];
  playTime: number;
  setPlayTime: (value: number) => void;
  playSliderValue: number;
  setPlaySliderValue: (value: number) => void;
  clipStart: number;
  setClipStart: (value: number) => void;
  clipEnd: number;
  setClipEnd: (value: number) => void;
  duration: number;
  setDuration: (value: number) => void;
  playerRef: React.MutableRefObject<ReactPlayer | null>;
  playing: boolean;
  setPlaying: (value: boolean) => void;
  currentlySeeking: boolean;
  setCurrentlySeeking: (value: boolean) => void;
  hermits: Hermit[];
  setHermits: (value: Hermit[]) => void;
  hermit: Hermit | null;
  setHermit: (value: Hermit | null) => void;
  tagline: string;
  setTagline: (value: string) => void;
  videoId: string;
  videoUrl: string;
  season: string;
  setSeason: (value: string) => void;
  playClip: () => void;
  file: File | null;
  setFile: (value: File | null) => void;
};

const ClipBuilderContext = React.createContext<ClipBuilderContextType>(
  {} as ClipBuilderContextType,
);

export const useClipBuilder = () => {
  return React.useContext(ClipBuilderContext);
};

type Props = {
  children: React.ReactNode;
};
export const ClipBuilderProvider = ({ children }: Props) => {
  const [zoomStart, setZoomStart] = useState(0);
  const [zoomEnd, setZoomEnd] = useState(0);

  const [fineZoomStart, setFineZoomStart] = useState(0);
  const [fineZoomEnd, setFineZoomEnd] = useState(0);

  const [usingFineZoom, setUsingFineZoom] = useState(false);

  const [playTime, setPlayTime] = useState(0);
  const [playSliderValue, setPlaySliderValue] = useState(0);

  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);

  const [duration, setDuration] = useState(0);

  const playerRef = React.useRef<ReactPlayer | null>(null);
  const [playing, setPlaying] = useState(false);

  const [currentlySeeking, setCurrentlySeeking] = useState(false);

  const [hermits, setHermits] = useState<Hermit[]>([]);
  const [hermit, setHermit] = useState<Hermit | null>(null);
  const [tagline, setTagline] = useState('');
  const [season, setSeason] = useState<string>('');

  const [file, setFile] = useState<File | null>(null);

  const searchParams = useSearchParams();
  const videoId = searchParams.get('id') || '';
  const videoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';

  useEffect(() => {
    if (!usingFineZoom) {
      setFineZoomStart(zoomStart);
      setFineZoomEnd(zoomEnd);
      return;
    }
    // check for zoomStart
    if (fineZoomStart < zoomStart) {
      setFineZoomStart(zoomStart);
    }
    if (fineZoomEnd < zoomStart) {
      setFineZoomEnd(zoomStart);
    }
    // check for zoomEnd
    if (fineZoomStart > zoomEnd) {
      setFineZoomStart(zoomEnd);
    }
    if (fineZoomEnd > zoomEnd) {
      setFineZoomEnd(zoomEnd);
    }
  }, [fineZoomStart, zoomStart, fineZoomEnd, zoomEnd]);

  // we want to be able to play the clip through once in a function we will export & trigger with a button
  const playClip = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(clipStart / 1000);
      playerRef.current.getInternalPlayer().playVideo();
      setPlaying(true);
    }

    const intervalLength = 100;

    const interval = setInterval(() => {
      if (playerRef.current) {
        // multiply by 1000 because floating point division is weird
        if (
          playerRef.current.getCurrentTime() * 1000 >=
          clipEnd - intervalLength
        ) {
          playerRef.current.seekTo(clipStart / 1000);
          playerRef.current.getInternalPlayer().pauseVideo();
          setPlaying(false);
          clearInterval(interval);
        }
      }
    }, intervalLength);
  };

  useEffect(() => {
    const player = playerRef.current;
    if (player && playing) {
      const interval = setInterval(() => {
        setPlayTime(player.getCurrentTime());
      }, 100);

      return () => {
        clearInterval(interval);
      };
    }
  }, [playerRef, setPlayTime, playing]);

  const getClipZoomRange = (): [number, number] => {
    if (usingFineZoom) {
      return [fineZoomStart, fineZoomEnd];
    }
    return [zoomStart, zoomEnd];
  };

  return (
    <Suspense
      fallback={
        <div className='flex h-full w-full items-center justify-center'>
          Loading...
        </div>
      }
    >
      <ClipBuilderContext.Provider
        value={{
          zoomStart,
          setZoomStart,
          zoomEnd,
          setZoomEnd,
          fineZoomStart,
          setFineZoomStart,
          fineZoomEnd,
          setFineZoomEnd,
          usingFineZoom,
          setUsingFineZoom,
          getClipZoomRange,
          playTime,
          setPlayTime,
          playSliderValue,
          setPlaySliderValue,
          clipStart,
          setClipStart,
          clipEnd,
          setClipEnd,
          duration,
          setDuration,
          playerRef,
          playing,
          setPlaying,
          currentlySeeking,
          setCurrentlySeeking,
          hermits,
          setHermits,
          hermit,
          setHermit,
          tagline,
          setTagline,
          videoId,
          videoUrl,
          season,
          setSeason,
          playClip,
          file,
          setFile,
        }}
      >
        {children}
      </ClipBuilderContext.Provider>
    </Suspense>
  );
};
