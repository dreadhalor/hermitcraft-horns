'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { cropAudioBuffer, trimAudioBuffer } from './audio-utils';
import { useSandboxAudioPlayer } from '../test-3/use-sandbox-audio-player';

export type AudioContextValue = {
  audioBuffer: AudioBuffer | null;
  duration: number;
  visibleStartTime: number;
  visibleEndTime: number;
  setAudioBuffer: (buffer: AudioBuffer | null) => void;
  setDuration: (duration: number) => void;
  setVisibleStartTime: (visibleStartTime: number) => void;
  setVisibleEndTime: (visibleEndTime: number) => void;
  undo: () => void;
  redo: () => void;
  handleCrop: (start: number, end: number) => void;
  handleTrim: (start: number, end: number) => void;
  // Re-exported from useSandboxAudioPlayer
  selectionStart: number | null;
  setSelectionStart: (start: number | null) => void;
  selectionEnd: number | null;
  setSelectionEnd: (end: number | null) => void;
  isPlaying: boolean;
  currentTime: number;
  loopType: 'none' | 'section' | 'track';
  loopEnabled: boolean;
  playPause: () => void;
  stopAudio: () => void;
  seekTo: (time: number) => void;
  toggleLoopSection: () => void;
  toggleLoopTrack: () => void;
  getCurrentTime: () => number;
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
  const [visibleStartTime, setVisibleStartTime] = useState(0);
  const [visibleEndTime, setVisibleEndTime] = useState(0);
  const [undoStack, setUndoStack] = useState<AudioBuffer[]>([]);
  const [redoStack, setRedoStack] = useState<AudioBuffer[]>([]);

  const {
    selectionStart,
    setSelectionStart,
    selectionEnd,
    setSelectionEnd,
    isPlaying,
    currentTime,
    loopType,
    loopEnabled,
    loadAudioBuffer,
    playPause,
    stopAudio,
    seekTo,
    toggleLoopSection,
    toggleLoopTrack,
    getCurrentTime,
  } = useSandboxAudioPlayer();

  useEffect(() => {
    if (audioBuffer) {
      loadAudioBuffer(audioBuffer);
      setVisibleEndTime(audioBuffer.duration);
    }
  }, [audioBuffer, loadAudioBuffer]);

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
    setSelectionStart(0);
    setSelectionEnd(cropped.duration);
  };

  const handleTrim = (start: number, end: number) => {
    if (!audioBuffer) return;

    pushToUndoStack(audioBuffer);
    setRedoStack([]);

    const trimmed = trimAudioBuffer(audioBuffer, start, end, duration);
    setAudioBuffer(trimmed);
    setDuration(trimmed.duration);
    setSelectionStart(0);
    setSelectionEnd(trimmed.duration);
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
    visibleStartTime,
    visibleEndTime,
    setAudioBuffer,
    setDuration,
    setVisibleStartTime,
    setVisibleEndTime,
    undo,
    redo,
    handleCrop,
    handleTrim,
    // Re-exported from useSandboxAudioPlayer
    selectionStart,
    setSelectionStart,
    selectionEnd,
    setSelectionEnd,
    isPlaying,
    currentTime,
    loopType,
    loopEnabled,
    playPause,
    stopAudio,
    seekTo,
    toggleLoopSection,
    toggleLoopTrack,
    getCurrentTime,
  };

  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
};
