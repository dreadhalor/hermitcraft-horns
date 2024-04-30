import React from 'react';
import ReactPlayer from 'react-player';

type AppContextType = {
  videoUrl: string;
  setVideoUrl: (url: string) => void;
  startTime: number;
  setStartTime: (time: number) => void;
  endTime: number;
  setEndTime: (time: number) => void;
  isLooping: boolean;
  setIsLooping: (looping: boolean) => void;
  playerRef: React.RefObject<ReactPlayer>;
};

type AppProviderProps = {
  children: React.ReactNode;
};

export const AppProvider = () => {
  return <div>AppProvider</div>;
};
