'use client';

import React, { useRef } from 'react';
import { ReactP5Wrapper } from '@p5-wrapper/react';
import { downloadAudio } from './audio-utils';
import { WaveformSketch } from './waveform-sketch';
import { MinimapSketch } from './minimap-sketch';
import { useAudioContext } from './audio-provider';
import { FaCropSimple } from 'react-icons/fa6';
import { MdLoop } from 'react-icons/md';
import { IoMdCut } from 'react-icons/io';
import { FaRedoAlt, FaUndoAlt } from 'react-icons/fa';
import { RiRewindStartFill } from 'react-icons/ri';
import LoopSelection from '@/assets/loop-selection.svg';
import Image from 'next/image';

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
    toggleLoopAndPlay,
  } = useAudioContext();

  const sketchWidthRef = useRef<HTMLDivElement>(null);

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

  const buttonClass = 'p-2 rounded-md transition-colors duration-200';
  const enabledClass = 'text-white';
  const disabledClass = 'text-gray-400 bg-gray-200 cursor-not-allowed';
  const rewindClass = 'bg-blue-500 hover:bg-blue-600';
  const playClass = 'bg-green-500 hover:bg-green-600';
  const pauseClass = 'bg-red-500 hover:bg-red-600';
  const loopClass = 'bg-yellow-500 hover:bg-yellow-600';
  const loopPlayClass = 'bg-purple-500 hover:bg-purple-600';
  const undoRedoClass = 'bg-orange-500 hover:bg-orange-600';

  return (
    <div className='w-full min-h-full flex flex-col items-center p-6 space-y-6 bg-[hsl(224,100%,73%)]'>
      <input
        type='file'
        accept='audio/*'
        onChange={handleFileUpload}
        className='p-2 border rounded'
      />
      <div className='flex gap-2'>
        <button
          onClick={stop}
          className={`${buttonClass} ${rewindClass} ${enabledClass}`}
        >
          <RiRewindStartFill />
        </button>
        <button
          id='play-butön'
          onClick={isPlaying ? pause : play}
          className={`${buttonClass} ${
            isPlaying ? pauseClass : playClass
          } ${enabledClass}`}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
      <div className='flex gap-2'>
        <button
          onClick={() => {
            setStartSelection(null);
            setEndSelection(null);
          }}
          className={`${buttonClass} ${
            startSelection !== null && endSelection !== null
              ? rewindClass
              : disabledClass
          }`}
          disabled={startSelection === null || endSelection === null}
        >
          Clear selection
        </button>
        <button
          onClick={toggleLoopAndPlay}
          className={`${buttonClass} ${
            startSelection !== null && endSelection !== null
              ? loopClass
              : disabledClass
          }`}
          disabled={startSelection === null || endSelection === null}
        >
          {/* {isLooping ? 'Stop Loop' : 'Loop selection'} */}
          <Image src={LoopSelection} alt='Loop Selection' className='w-6 h-6' />
        </button>
        <button
          className={`${buttonClass} ${
            startSelection !== null && endSelection !== null
              ? loopPlayClass
              : disabledClass
          }`}
        >
          <MdLoop />
        </button>
        {/* <button
          onClick={toggleLoopAndPlay}
          className={`${buttonClass} ${
            startSelection !== null && endSelection !== null
              ? loopPlayClass
              : disabledClass
          }`}
          disabled={startSelection === null || endSelection === null}
        >
          Loop & Play
        </button> */}
      </div>
      <div className='flex gap-2'>
        <button
          onClick={handleCropClick}
          className={`${buttonClass} ${
            startSelection !== null && endSelection !== null
              ? rewindClass
              : disabledClass
          } flex items-center gap-2`}
          disabled={startSelection === null || endSelection === null}
        >
          <FaCropSimple />
          Crop
        </button>
        <button
          onClick={handleTrimClick}
          className={`${buttonClass} ${
            startSelection !== null && endSelection !== null
              ? playClass
              : disabledClass
          } flex items-center gap-2`}
          disabled={startSelection === null || endSelection === null}
        >
          <IoMdCut />
          Trim
        </button>
        <button
          onClick={undo}
          className={`${buttonClass} ${undoRedoClass} ${enabledClass}`}
        >
          <FaUndoAlt />
        </button>
        <button
          onClick={redo}
          className={`${buttonClass} ${undoRedoClass} ${enabledClass}`}
        >
          <FaRedoAlt />
        </button>
      </div>
      <div className='text-lg font-semibold'>
        Current Time: {currentTime.toFixed(2)}
      </div>
      <div
        id='waveform'
        className='w-full bg-[#4665BA] rounded-md shadow mb-4 p-4 min-h-0'
      >
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
          toggleLoop={toggleLoopAndPlay}
          availableWidth={sketchWidthRef.current?.clientWidth ?? 0}
        />
      </div>
      <div
        id='minimap'
        className='w-full relative bg-[#4665BA] rounded-md shadow p-4 min-h-0'
      >
        <div className='relative w-full h-full'>
          <div ref={sketchWidthRef} className='absolute inset-0' />
          <ReactP5Wrapper
            sketch={MinimapSketch as any}
            audioBuffer={audioBuffer}
            currentTime={currentTime}
            startSelection={startSelection}
            endSelection={endSelection}
            visibleStartTime={visibleStartTime}
            visibleEndTime={visibleEndTime}
            onBoundsChange={handleBoundsChange}
            availableWidth={sketchWidthRef.current?.clientWidth ?? 0}
          />
        </div>
      </div>
      <button
        onClick={() => downloadAudio(audioBuffer)}
        className={`${buttonClass} ${
          audioBuffer ? rewindClass : disabledClass
        }`}
        disabled={!audioBuffer}
      >
        Download
      </button>
    </div>
  );
};

export default Page;
