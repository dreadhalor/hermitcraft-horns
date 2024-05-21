'use client';

import React, { useEffect } from 'react';
import { ReactP5Wrapper } from '@p5-wrapper/react';
import { cropAudioBuffer, downloadAudio, trimAudioBuffer } from './audio-utils';
import { WaveformSketch } from './waveform-sketch';
import { MinimapSketch } from './minimap-sketch';
import { useAudioContext } from './audio-provider';

const Page = () => {
  const {
    audioBuffer,
    duration,
    isPlaying,
    startSelection,
    endSelection,
    visibleStartTime,
    visibleEndTime,
    audioContextRef,
    setAudioBuffer,
    setDuration,
    setStartSelection,
    setEndSelection,
    setVisibleStartTime,
    setVisibleEndTime,
    togglePlayPause,
    rewindAudio,
    currentTime,
    setCurrentTime,
    undo,
    redo,
    handleCrop,
    handleTrim,
  } = useAudioContext();

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
    setCurrentTime(seekTime);
  };

  const clampSeekTime = (time: number) => {
    return Math.min(Math.max(time, 0), duration);
  };

  const handleSelectionChange = (start: number | null, end: number | null) => {
    const clampedStart = start === null ? null : clampSeekTime(start);
    const clampedEnd = end === null ? null : clampSeekTime(end);
    if (start === null || end === null) {
      setStartSelection(null);
      setEndSelection(null);
    } else {
      setStartSelection(clampedStart);
      setEndSelection(clampedEnd);
    }
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
        <button onClick={rewindAudio}>Rewind</button>
        <button onClick={togglePlayPause}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
      <div className='flex gap-2 border-b'>
        <button onClick={handleCropClick}>Crop</button>
        <button onClick={handleTrimClick}>Trim</button>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
      </div>
      <div>Current Time: {currentTime.toFixed(2)}</div>
      <div id='seek-waveform'>
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
          setCurrentTime={setCurrentTime}
          isSelectionWaveform={false}
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
          visibleStartTime={visibleStartTime}
          visibleEndTime={visibleEndTime}
          onSelectionChange={handleSelectionChange}
          isSelectionWaveform={true}
        />
      </div>
      <div id='minimap'>
        <ReactP5Wrapper
          sketch={MinimapSketch as any}
          audioBuffer={audioBuffer}
          currentTime={currentTime}
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
