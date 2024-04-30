'use client';

import React, { useState } from 'react';

type AppContextType = {
  zoomStart: number;
  setZoomStart: (value: number) => void;
  zoomEnd: number;
  setZoomEnd: (value: number) => void;
  playTime: number;
  setPlayTime: (value: number) => void;
  playSliderValue: number;
  setPlaySliderValue: (value: number) => void;
  clipStart: number;
  setClipStart: (value: number) => void;
  clipEnd: number;
  setClipEnd: (value: number) => void;
};

const AppContext = React.createContext<AppContextType>({} as AppContextType);

export const useApp = () => {
  return React.useContext(AppContext);
};

type Props = {
  children: React.ReactNode;
};
export const AppProvider = ({ children }: Props) => {
  const [zoomStart, setZoomStart] = useState(0);
  const [zoomEnd, setZoomEnd] = useState(0);

  const [playTime, setPlayTime] = useState(0);
  const [playSliderValue, setPlaySliderValue] = useState(0);

  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);

  return (
    <AppContext.Provider
      value={{
        zoomStart,
        setZoomStart,
        zoomEnd,
        setZoomEnd,
        playTime,
        setPlayTime,
        playSliderValue,
        setPlaySliderValue,
        clipStart,
        setClipStart,
        clipEnd,
        setClipEnd,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
