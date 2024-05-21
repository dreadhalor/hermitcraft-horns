'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

export type AudioContextValue = {
  audioBuffer: AudioBuffer | null;
  duration: number;
  isPlaying: boolean;
  startSelection: number | null;
  endSelection: number | null;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  sourceRef: React.MutableRefObject<AudioBufferSourceNode | null>;
  setAudioBuffer: (buffer: AudioBuffer | null) => void;
  setDuration: (duration: number) => void;
  setStartSelection: (startSelection: number | null) => void;
  setEndSelection: (endSelection: number | null) => void;
  togglePlayPause: () => void;
  currentTime: number;
  setCurrentTime: (currentTime: number) => void;
  rewindAudio: () => void;
};

const AudioContext = createContext<AudioContextValue | undefined>(undefined);

export const useAudioContext = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startSelection, setStartSelection] = useState<number | null>(null);
  const [endSelection, setEndSelection] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    console.log('current time:', currentTime);
  }, [currentTime]);

  const togglePlayPause = () => {
    if (!audioBuffer || !audioContextRef.current) return;

    if (isPlaying) {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      setIsPlaying(false);
    } else {
      console.log('current time:', currentTime);
      console.log('duration:', duration);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(0, currentTime);
      sourceRef.current = source;

      source.onended = () => {
        sourceRef.current = null;
        setIsPlaying(false);
      };

      const startTime = audioContextRef.current.currentTime - currentTime;
      const updateCurrentTime = () => {
        console.log('updating current time');
        console.log('isPlaying:', isPlaying);
        if (sourceRef.current && audioContextRef.current) {
          setCurrentTime(audioContextRef.current.currentTime - startTime);
          requestAnimationFrame(updateCurrentTime);
        }
      };

      setIsPlaying(true);
      requestAnimationFrame(() => {
        updateCurrentTime();
      });
    }
  };

  const rewindAudio = () => {
    if (!audioBuffer || !audioContextRef.current) return;

    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    setCurrentTime(0);
    setIsPlaying(false);
  };

  const value: AudioContextValue = {
    audioBuffer,
    duration,
    isPlaying,
    startSelection,
    endSelection,
    audioContextRef,
    sourceRef,
    setAudioBuffer,
    setDuration,
    setStartSelection,
    setEndSelection,
    togglePlayPause,
    currentTime,
    setCurrentTime,
    rewindAudio,
  };

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
};
