'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createAudioUrl, cropAudioBuffer, downloadAudio } from './audio-utils';
import { WaveformSketch } from './waveform-sketch';

const Page = () => {
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const seekWaveformRef = useRef<WaveformSketch | null>(null);
  const selectionWaveformRef = useRef<WaveformSketch | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [duration, setDuration] = useState(0);
  const [startSelection, setStartSelection] = useState<number | null>(null);
  const [endSelection, setEndSelection] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    audioContextRef.current = new AudioContext();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const audioContext = new AudioContext();
    const fileReader = new FileReader();

    fileReader.onload = async () => {
      const arrayBuffer = fileReader.result as ArrayBuffer;
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      setAudioBuffer(audioBuffer);
      setDuration(audioBuffer.duration);
    };

    fileReader.readAsArrayBuffer(file);
  };

  const handleSeekClick = (seekTime: number) => {
    if (!audioBuffer) return;

    const audio = document.querySelector('audio');
    if (audio) {
      audio.currentTime = seekTime;
    }
  };

  const handleSelectionChange = (start: number | null, end: number | null) => {
    if (start === null || end === null) {
      setStartSelection(null);
      setEndSelection(null);
    }
    const realStart = Math.min(start || 0, end || 0);
    const realEnd = Math.max(start || 0, end || 0);
    setStartSelection(realStart);
    setEndSelection(realEnd);
  };

  const handleCropClick = () => {
    if (!audioBuffer || startSelection === null || endSelection === null)
      return;

    const cropped = cropAudioBuffer(
      audioBuffer,
      startSelection,
      endSelection,
      duration
    );
    setAudioBuffer(cropped);
    setDuration(cropped.duration);

    seekWaveformRef.current?.setAudioBuffer(cropped);
    selectionWaveformRef.current?.setAudioBuffer(cropped);
  };

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
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      sourceRef.current = source;

      source.onended = () => {
        sourceRef.current = null;
        setIsPlaying(false);
      };

      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (!audioContextRef.current) return;
    seekWaveformRef.current = new WaveformSketch(
      500,
      200,
      'seek-waveform',
      handleSeekClick,
      undefined
    );
    selectionWaveformRef.current = new WaveformSketch(
      500,
      200,
      'selection-waveform',
      undefined,
      handleSelectionChange
    );
    return () => {
      seekWaveformRef.current?.remove();
      selectionWaveformRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (audioBuffer) {
      seekWaveformRef.current?.setAudioBuffer(audioBuffer);
      selectionWaveformRef.current?.setAudioBuffer(audioBuffer);
    }
  }, [audioBuffer]);

  return (
    <div className='w-full h-full flex flex-col items-center justify-center'>
      <input type='file' accept='audio/*' onChange={handleFileUpload} />
      <button onClick={togglePlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
      <div id='seek-waveform' />
      <div id='selection-waveform' />
      <button onClick={handleCropClick}>Crop</button>
      <button onClick={() => downloadAudio(audioBuffer)}>Download</button>
    </div>
  );
};

export default Page;
