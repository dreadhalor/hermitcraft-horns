'use client';

import React, { useEffect } from 'react';
import { ReactP5Wrapper } from '@p5-wrapper/react';
import { cropAudioBuffer, downloadAudio } from './audio-utils';
import { WaveformSketch } from './waveform-sketch';
import { useAudioContext } from './audio-provider';

const Page = () => {
  const ctx = useAudioContext();
  const {
    audioBuffer,
    duration,
    isPlaying,
    startSelection,
    endSelection,
    audioContextRef,
    setAudioBuffer,
    setDuration,
    setStartSelection,
    setEndSelection,
    togglePlayPause,
    rewindAudio,
    currentTime,
  } = ctx;

  useEffect(() => {
    audioContextRef.current = new AudioContext();
    return () => {
      audioContextRef.current?.close();
    };
  }, [audioContextRef]);

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
    } else {
      const realStart = Math.min(start, end);
      const realEnd = Math.max(start, end);
      setStartSelection(realStart);
      setEndSelection(realEnd);
    }
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
  };

  return (
    <div className='w-full h-full flex flex-col items-center justify-center'>
      <input type='file' accept='audio/*' onChange={handleFileUpload} />
      <button onClick={rewindAudio}>Rewind</button>
      <button onClick={togglePlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
      <div>Current Time: {currentTime.toFixed(2)}</div>
      <div id='seek-waveform'>
        <ReactP5Wrapper
          sketch={WaveformSketch as any}
          audioBuffer={audioBuffer}
          currentTime={currentTime}
          duration={duration}
          startSelection={startSelection}
          endSelection={endSelection}
          onSeekClick={handleSeekClick}
        />
      </div>
      <div id='selection-waveform'>
        <ReactP5Wrapper
          sketch={WaveformSketch as any}
          audioBuffer={audioBuffer}
          currentTime={currentTime}
          duration={duration}
          startSelection={startSelection}
          endSelection={endSelection}
          onSelectionChange={handleSelectionChange}
        />
      </div>
      <button onClick={handleCropClick}>Crop</button>
      <button onClick={() => downloadAudio(audioBuffer)}>Download</button>
    </div>
  );
};

export default Page;
