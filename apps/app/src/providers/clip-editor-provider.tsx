'use client';

import React, { useState } from 'react';
import { Hermit } from '@drizzle/db';
import { useEditClip } from '@/hooks/use-edit-clip';
import { trpc } from '@/trpc/client';

type ClipEditorContextType = {
  hermits: Hermit[];
  hermit: Hermit | null;
  setHermit: (value: Hermit | null) => void;
  tagline: string;
  setTagline: (value: string) => void;
  season: string;
  setSeason: (value: string) => void;
};

const ClipEditorContext = React.createContext<ClipEditorContextType>(
  {} as ClipEditorContextType,
);

export const useClipEditor = () => {
  return React.useContext(ClipEditorContext);
};

type Props = {
  children: React.ReactNode;
  horn: any;
};
export const ClipEditorProvider = ({ children, horn }: Props) => {
  const { data: hermits, isLoading } = trpc.getHermitChannels.useQuery();
  const [hermit, setHermit] = useState<Hermit | null>(null);
  const [tagline, setTagline] = useState('');
  const [season, setSeason] = useState<string>('');

  if (isLoading || !hermits) {
    return <div>Loading...</div>;
  }

  return (
    <ClipEditorContext.Provider
      value={{
        hermits,
        hermit,
        setHermit,
        tagline,
        setTagline,
        season,
        setSeason,
      }}
    >
      {children}
    </ClipEditorContext.Provider>
  );
};
