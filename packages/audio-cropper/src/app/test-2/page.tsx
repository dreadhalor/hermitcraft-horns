'use client';
import React, { useRef, useState, useEffect } from 'react';
import { createAudioUrl, cropAudioBuffer, downloadAudio } from './audio-utils';
import { WaveformSketch } from './waveform-sketch';

const Page = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const seekWaveformRef = useRef<WaveformSketch | null>(null);
  const selectionWaveformRef = useRef<WaveformSketch | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [startSelection, setStartSelection] = useState<number | null>(null);
  const [endSelection, setEndSelection] = useState<number | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const audioContext = new AudioContext();
    const fileReader = new FileReader();

    fileReader.onload = async () => {
      const arrayBuffer = fileReader.result as ArrayBuffer;
      const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);
      setAudioBuffer(decodedAudio);
      setAudioUrl(URL.createObjectURL(file));
      setDuration(decodedAudio.duration);
    };

    fileReader.readAsArrayBuffer(file);
  };

  const handleSeekClick = (seekTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
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
    createAudioUrl(cropped, setAudioUrl);
    setStartSelection(null);
    setEndSelection(null);
  };

  useEffect(() => {
    if (!audioRef.current) return;

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
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioBuffer) {
      seekWaveformRef.current?.setAudioBuffer(audioBuffer);
      selectionWaveformRef.current?.setAudioBuffer(audioBuffer);
    }
  }, [audioBuffer]);

  return (
    <div className='w-full h-full flex flex-col items-center justify-center'>
      <input type='file' accept='audio/*' onChange={handleFileUpload} />
      <audio ref={audioRef} src={audioUrl || undefined} controls />
      <div id='seek-waveform' />
      <div id='selection-waveform' />
      <button onClick={handleCropClick}>Crop</button>
      <button onClick={() => downloadAudio(audioBuffer)}>Download</button>
    </div>
  );
};

export default Page;
