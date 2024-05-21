'use client';

import React, { useEffect } from 'react';
import { ReactP5Wrapper } from '@p5-wrapper/react';
import { downloadAudio } from './audio-utils';
import { WaveformSketch } from './waveform-sketch';
import { MinimapSketch } from './minimap-sketch';
import { useAudioContext } from './audio-provider';

const Page = () => {
  const {
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
  } = useAudioContext();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const audioContext = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const decodedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    setAudioBuffer(decodedAudioBuffer);
    setDuration(decodedAudioBuffer.duration);
  };

  const handleSeekClick = (seekTime: number) => {
    seekTo(seekTime);
  };

  const clampSeekTime = (time: number) => {
    return Math.min(Math.max(time, 0), duration);
  };

  const handleSelectionChange = (start: number | null, end: number | null) => {
    const clampedStart = start === null ? null : clampSeekTime(start);
    const clampedEnd = end === null ? null : clampSeekTime(end);
    setStartSelection(clampedStart);
    setEndSelection(clampedEnd);
  };

  const handleCropClick = () => {
    if (!audioBuffer || startSelection === null || endSelection === null)
      return;
    handleCrop(
      Math.min(startSelection, endSelection),
      Math.max(startSelection, endSelection)
    );
  };

  const handleTrimClick = () => {
    if (!audioBuffer || startSelection === null || endSelection === null)
      return;
    handleTrim(
      Math.min(startSelection, endSelection),
      Math.max(startSelection, endSelection)
    );
  };

  const handleBoundsChange = (start: number, end: number) => {
    setVisibleStartTime(start);
    setVisibleEndTime(end);
  };

  return (
    <div className='w-full h-full flex flex-col items-center justify-center'>
      <input type='file' accept='audio/*' onChange={handleFileUpload} />
      <div className='flex gap-2 border-b'>
        <button onClick={stop}>Rewind</button>
        <button onClick={isPlaying ? pause : play}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
      {startSelection !== null && endSelection !== null && (
        <div className='flex gap-2 border-b'>
          <button
            onClick={() => {
              setStartSelection(null);
              setEndSelection(null);
            }}
          >
            Clear selection
          </button>
          <button onClick={toggleLoop}>
            {isLooping ? 'Stop Loop' : 'Loop selection'}
          </button>
        </div>
      )}
      <div className='flex gap-2 border-b'>
        <button onClick={handleCropClick}>Crop</button>
        <button onClick={handleTrimClick}>Trim</button>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
      </div>
      <div>Current Time: {currentTime.toFixed(2)}</div>
      <div id='waveform' className='mb-2'>
        <ReactP5Wrapper
          sketch={WaveformSketch as any}
          audioBuffer={audioBuffer}
          currentTime={currentTime}
          duration={duration}
          startSelection={startSelection}
          endSelection={endSelection}
          visibleStartTime={visibleStartTime}
          visibleEndTime={visibleEndTime}
          onSeekClick={handleSeekClick}
          onSelectionChange={handleSelectionChange}
          seekTo={seekTo}
        />
      </div>
      <div id='minimap'>
        <ReactP5Wrapper
          sketch={MinimapSketch as any}
          audioBuffer={audioBuffer}
          currentTime={currentTime}
          startSelection={startSelection}
          endSelection={endSelection}
          visibleStartTime={visibleStartTime}
          visibleEndTime={visibleEndTime}
          onBoundsChange={handleBoundsChange}
        />
      </div>
      <button onClick={() => downloadAudio(audioBuffer)}>Download</button>
    </div>
  );
};

export default Page;
