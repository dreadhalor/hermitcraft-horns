'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';

type ClipPlayerContextType = {
  url: string;
  setUrl: (url: string) => void;
  seekTo: (time: number) => void;
  play: () => void;
  setStart: (time: number) => void;
  setEnd: (time: number) => void;
};

const ClipPlayerContext = createContext<ClipPlayerContextType>(
  {} as ClipPlayerContextType,
);

export const useClipPlayer = () => {
  return useContext(ClipPlayerContext);
};

type Props = {
  children: React.ReactNode;
};
export const ClipPlayerProvider = ({ children }: Props) => {
  const [url, setUrl] = useState('');
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<ReactPlayer>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  const [isClient, setIsClient] = useState(false);

  const seekTo = (time: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time);
    }
  };

  const play = () => {
    if (playerRef.current) {
      playerRef.current.getInternalPlayer()?.playVideo();
    }
  };

  useEffect(() => {
    if (playerRef.current) {
      const player = playerRef.current;
      player.seekTo(startTime);
    }
  }, [startTime]);

  useEffect(() => {
    if (playerRef.current) {
      const player = playerRef.current;
      if (player.getInternalPlayer()?.getPlayerState() === 1) {
        setIsPlaying(true);
      }
      player.getInternalPlayer()?.playVideo();

      const loopInterval = setInterval(() => {
        if (player.getCurrentTime() >= endTime) {
          console.log('end time reached', player.getCurrentTime(), endTime);
          player.getInternalPlayer()?.pauseVideo();
        }
      }, 100);

      return () => {
        clearInterval(loopInterval);
      };
    }
  }, [isPlaying, startTime, endTime]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <ClipPlayerContext.Provider
      value={{
        url,
        setUrl,
        seekTo,
        play,
        setStart: setStartTime,
        setEnd: setEndTime,
      }}
    >
      {children}
      {isClient && (
        <ReactPlayer
          url={url}
          ref={playerRef}
          controls
          onReady={() => {
            console.log('Player ready');
            setPlayerReady(true);
          }}
          className='h-full max-h-full w-full max-w-full'
        />
      )}
    </ClipPlayerContext.Provider>
  );
};
