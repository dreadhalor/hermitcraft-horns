'use client';

import React, { createContext, useContext, useState } from 'react';

type ClipState = {
  clipUrl: string | null;
  setClipUrl: (url: string | null) => void;
};

const ClipContext = createContext<ClipState | undefined>(undefined);

export const ClipProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [clipUrl, setClipUrl] = useState<string | null>(null);

  return (
    <ClipContext.Provider value={{ clipUrl, setClipUrl }}>
      {children}
    </ClipContext.Provider>
  );
};

export const useClipContext = () => {
  const context = useContext(ClipContext);
  if (!context) {
    throw new Error('useClipContext must be used within a ClipProvider');
  }
  return context;
};
