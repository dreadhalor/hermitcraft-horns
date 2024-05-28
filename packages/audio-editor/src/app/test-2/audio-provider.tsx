'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { cropAudioBuffer, trimAudioBuffer } from './audio-utils';
import { useAudioPlayer } from './use-audio-player';
import { useCallback } from 'react';
import { exportAudioAsync } from './audio-export/audio-export-async';
import { unmute } from './unmute';

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
  canUndo: boolean;
  redo: () => void;
  canRedo: boolean;
  handleCrop: (start: number, end: number) => void;
  handleTrim: (start: number, end: number) => void;
  // Re-exported from useAudioPlayer
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
  clearSelection: () => void;
  handleFileUpload: (file: File | undefined) => void;
  exportFile: () => Promise<Blob | undefined>;
  exportingFile: boolean;
};

const AudioProviderContext = createContext<AudioContextValue | undefined>(
  undefined
);

export const useAudioContext = () => {
  const context = useContext(AudioProviderContext);
  if (!context) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: React.ReactNode;
  initialFileBuffer?: string; // Base64 string
}
export const AudioProvider = ({
  children,
  initialFileBuffer,
}: AudioProviderProps) => {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [duration, setDuration] = useState(0);
  const [visibleStartTime, setVisibleStartTime] = useState(0);
  const [visibleEndTime, setVisibleEndTime] = useState(0);
  const [undoStack, setUndoStack] = useState<AudioBuffer[]>([]);
  const [redoStack, setRedoStack] = useState<AudioBuffer[]>([]);
  const [exportingFile, setExportingFile] = useState(false);

  useEffect(() => {
    if (initialFileBuffer) {
      const byteString = atob(initialFileBuffer); // Decode base64
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uintArray = new Uint8Array(arrayBuffer);
      for (let i = 0; i < byteString.length; i++) {
        uintArray[i] = byteString.charCodeAt(i);
      }
      const initFile = new File([uintArray], 'audio.mp3', {
        type: 'audio/mp3',
      });
      handleFileUpload(initFile);
    }
  }, [initialFileBuffer]);

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
    clearSelection,
    pauseAudio,
  } = useAudioPlayer();

  useEffect(() => {
    if (audioBuffer) {
      loadAudioBuffer(audioBuffer);
      setVisibleEndTime(audioBuffer.duration);
    }
  }, [audioBuffer, loadAudioBuffer]);

  const pushToUndoStack = (buffer: AudioBuffer) => {
    setUndoStack((prevStack) => [buffer, ...prevStack]);
  };

  const handleFileUpload = useCallback(async (file: File | undefined) => {
    const audioContext = new AudioContext();
    unmute(audioContext);
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const decodedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    setAudioBuffer(decodedAudioBuffer);
    setDuration(decodedAudioBuffer.duration);
  }, []);

  const exportFile = async () => {
    if (!audioBuffer) return;

    setExportingFile(true);
    try {
      const blob = await exportAudioAsync(audioBuffer);
      setExportingFile(false);
      return blob;
    } catch (error) {
      console.error('Export failed', error);
      setExportingFile(false);
    }
  };

  const handleCrop = (start: number, end: number) => {
    if (!audioBuffer) return;

    pushToUndoStack(audioBuffer);
    setRedoStack([]);

    const cropped = cropAudioBuffer(audioBuffer, start, end, duration);
    setAudioBuffer(cropped);
    setDuration(cropped.duration);
    pauseAudio();
    clearSelection();
    setVisibleStartTime(0);
    setVisibleEndTime(cropped.duration);
  };

  const handleTrim = (start: number, end: number) => {
    if (!audioBuffer) return;

    pushToUndoStack(audioBuffer);
    setRedoStack([]);

    const trimmed = trimAudioBuffer(audioBuffer, start, end, duration);
    setAudioBuffer(trimmed);
    setDuration(trimmed.duration);
    pauseAudio();
    clearSelection();
    setVisibleStartTime(0);
    setVisibleEndTime(trimmed.duration);
  };

  const undo = () => {
    if (undoStack.length > 0) {
      const previousBuffer = undoStack[0];
      setUndoStack((prevStack) => prevStack.slice(1));
      setRedoStack((prevStack) => [audioBuffer!, ...prevStack]);
      if (previousBuffer) {
        setAudioBuffer(previousBuffer);
        setDuration(previousBuffer.duration);
      }
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const nextBuffer = redoStack[0];
      setRedoStack((prevStack) => prevStack.slice(1));
      setUndoStack((prevStack) => [audioBuffer!, ...prevStack]);
      if (nextBuffer) {
        setAudioBuffer(nextBuffer);
        setDuration(nextBuffer.duration);
      }
    }
  };

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

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
    canUndo,
    redo,
    canRedo,
    handleCrop,
    handleTrim,
    // Re-exported from useAudioPlayer
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
    clearSelection,
    handleFileUpload,
    exportFile,
    exportingFile,
  };

  return (
    <AudioProviderContext.Provider value={value}>
      {children}
    </AudioProviderContext.Provider>
  );
};
