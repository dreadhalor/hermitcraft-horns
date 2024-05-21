'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { cropAudioBuffer, trimAudioBuffer } from './audio-utils';
import { useAudioPlayer } from './use-audio-player';

export type AudioContextValue = {
  audioBuffer: AudioBuffer | null;
  duration: number;
  startSelection: number | null;
  endSelection: number | null;
  visibleStartTime: number;
  visibleEndTime: number;
  isLooping: boolean;
  setAudioBuffer: (buffer: AudioBuffer | null) => void;
  setDuration: (duration: number) => void;
  setStartSelection: (startSelection: number | null) => void;
  setEndSelection: (endSelection: number | null) => void;
  setVisibleStartTime: (visibleStartTime: number) => void;
  setVisibleEndTime: (visibleEndTime: number) => void;
  undo: () => void;
  redo: () => void;
  handleCrop: (start: number, end: number) => void;
  handleTrim: (start: number, end: number) => void;
  // Re-exported from useAudioPlayer
  isPlaying: boolean;
  currentTime: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (time: number) => void;
  toggleLoop: () => void;
  toggleLoopAndPlay: () => void;
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
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [duration, setDuration] = useState(0);
  const [startSelection, setStartSelection] = useState<number | null>(null);
  const [endSelection, setEndSelection] = useState<number | null>(null);
  const [visibleStartTime, setVisibleStartTime] = useState(0);
  const [visibleEndTime, setVisibleEndTime] = useState(0);
  const [undoStack, setUndoStack] = useState<AudioBuffer[]>([]);
  const [redoStack, setRedoStack] = useState<AudioBuffer[]>([]);

  const {
    isPlaying,
    currentTime,
    play,
    pause,
    stop,
    seekTo,
    isLooping,
    toggleLoop,
    toggleLoopAndPlay,
  } = useAudioPlayer(audioBuffer, startSelection, endSelection);

  useEffect(() => {
    if (audioBuffer) {
      setVisibleEndTime(audioBuffer.duration);
    }
  }, [audioBuffer]);

  const pushToUndoStack = (buffer: AudioBuffer) => {
    setUndoStack((prevStack) => [buffer, ...prevStack]);
  };

  const handleCrop = (start: number, end: number) => {
    if (!audioBuffer) return;

    pushToUndoStack(audioBuffer);
    setRedoStack([]);

    const cropped = cropAudioBuffer(audioBuffer, start, end, duration);
    setAudioBuffer(cropped);
    setDuration(cropped.duration);
    setStartSelection(null);
    setEndSelection(null);
  };

  const handleTrim = (start: number, end: number) => {
    if (!audioBuffer) return;

    pushToUndoStack(audioBuffer);
    setRedoStack([]);

    const trimmed = trimAudioBuffer(audioBuffer, start, end, duration);
    setAudioBuffer(trimmed);
    setDuration(trimmed.duration);
    setStartSelection(null);
    setEndSelection(null);
  };

  const undo = () => {
    if (undoStack.length > 0) {
      const previousBuffer = undoStack[0];
      setUndoStack((prevStack) => prevStack.slice(1));
      setRedoStack((prevStack) => [audioBuffer!, ...prevStack]);
      setAudioBuffer(previousBuffer);
      setDuration(previousBuffer.duration);
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const nextBuffer = redoStack[0];
      setRedoStack((prevStack) => prevStack.slice(1));
      setUndoStack((prevStack) => [audioBuffer!, ...prevStack]);
      setAudioBuffer(nextBuffer);
      setDuration(nextBuffer.duration);
    }
  };

  const value: AudioContextValue = {
    audioBuffer,
    duration,
    startSelection,
    endSelection,
    visibleStartTime,
    visibleEndTime,
    isLooping,
    setAudioBuffer,
    setDuration,
    setStartSelection,
    setEndSelection,
    setVisibleStartTime,
    setVisibleEndTime,
    undo,
    redo,
    handleCrop,
    handleTrim,
    // Re-exported from useAudioPlayer
    isPlaying,
    currentTime,
    play,
    pause,
    stop,
    seekTo,
    toggleLoop,
    toggleLoopAndPlay,
  };

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
};
