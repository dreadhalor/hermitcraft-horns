'use client';

import React, { useEffect, useRef } from 'react';
import { NextReactP5Wrapper } from '@p5-wrapper/next';
import { WaveformSketch } from './waveform-sketch';
import { MinimapSketch } from './minimap-sketch';
import { useAudioContext } from './audio-provider';
import { FaCropSimple } from 'react-icons/fa6';
import { IoIosRedo, IoMdCut } from 'react-icons/io';
import { FaPlay, FaPause } from 'react-icons/fa';
import { RiRewindStartFill } from 'react-icons/ri';
import LoopSelection from '@audio-editor/assets/loop-selection.svg';
import ClearSelection from '@audio-editor/assets/clear-selection.svg';
import { MdLoop } from 'react-icons/md';
import { cn } from '@audio-editor/lib/utils';
import { IoIosUndo } from 'react-icons/io';

const Navbar = () => {
  const {
    audioBuffer,
    selectionStart,
    selectionEnd,
    undo,
    canUndo,
    redo,
    canRedo,
    handleCrop,
    handleTrim,
    // Re-exported from useAudioPlayer
    isPlaying,
    playPause,
    stopAudio,
    toggleLoopSection,
    toggleLoopTrack,
    loopType,
    clearSelection,
  } = useAudioContext();

  const hasTrack = audioBuffer !== null;
  const hasSelection = selectionStart !== null && selectionEnd !== null;

  const buttonClass =
    'flex items-center justify-center p-0 rounded-md w-[32px] h-[32px] bg-blue-500 hover:bg-blue-600 transition-colors duration-200';
  const enabledClass = 'text-white';
  const disabledClass =
    'text-gray-400 bg-gray-200 hover:bg-gray-200 cursor-not-allowed';
  const toggledOnClass = 'bg-blue-700 hover:bg-blue-700';

  const handleCropClick = () => {
    if (!audioBuffer || selectionStart === null || selectionEnd === null)
      return;
    handleCrop(
      Math.min(selectionStart, selectionEnd),
      Math.max(selectionStart, selectionEnd)
    );
  };

  const handleTrimClick = () => {
    if (!audioBuffer || selectionStart === null || selectionEnd === null)
      return;
    handleTrim(
      Math.min(selectionStart, selectionEnd),
      Math.max(selectionStart, selectionEnd)
    );
  };

  return (
    <div className='flex flex-wrap items-center justify-center gap-4'>
      <div className='flex'>
        <button
          onClick={stopAudio}
          className={cn(
            buttonClass,
            hasTrack ? enabledClass : disabledClass,
            'rounded-l-md rounded-r-none'
          )}
        >
          <RiRewindStartFill />
        </button>
        <button
          onClick={playPause}
          className={cn(
            buttonClass,
            hasTrack ? enabledClass : disabledClass,
            'rounded-l-none rounded-r-md'
          )}
        >
          {isPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
        </button>
      </div>
      <div className='flex'>
        <button
          onClick={toggleLoopTrack}
          className={cn(
            buttonClass,
            loopType === 'track' && toggledOnClass,
            hasTrack ? enabledClass : disabledClass,
            'rounded-l-md rounded-r-none'
          )}
        >
          <MdLoop />
        </button>
        <button
          onClick={toggleLoopSection}
          className={cn(
            buttonClass,
            loopType === 'section' && toggledOnClass,
            !hasSelection && disabledClass,
            'rounded-none'
          )}
          disabled={!hasSelection}
        >
          <LoopSelection
            className={cn(
              'w-6 h-6 transition-colors duration-200',
              hasSelection ? 'fill-white' : 'fill-gray-400'
            )}
          />
        </button>
        <button
          onClick={clearSelection}
          className={cn(
            buttonClass,
            !hasSelection && disabledClass,
            'rounded-l-none rounded-r-md'
          )}
          disabled={selectionStart === null || selectionEnd === null}
        >
          <ClearSelection
            className={cn(
              'w-6 h-6 transition-colors duration-200',
              hasSelection ? 'fill-white' : 'fill-gray-400'
            )}
          />
        </button>
      </div>
      <div className='flex'>
        <button
          onClick={handleCropClick}
          className={cn(
            buttonClass,
            hasSelection ? enabledClass : disabledClass,
            'flex items-center gap-2 rounded-l-md rounded-r-none'
          )}
          disabled={!hasSelection}
        >
          <FaCropSimple />
        </button>
        <button
          onClick={handleTrimClick}
          className={cn(
            buttonClass,
            hasSelection ? enabledClass : disabledClass,
            'flex items-center gap-2 rounded-none'
          )}
          disabled={!hasSelection}
        >
          <IoMdCut />
        </button>
        <button
          onClick={undo}
          className={cn(
            buttonClass,
            canUndo ? enabledClass : disabledClass,
            'rounded-none'
          )}
        >
          <IoIosUndo />
        </button>
        <button
          onClick={redo}
          className={cn(
            buttonClass,
            canRedo ? enabledClass : disabledClass,
            'rounded-l-none rounded-r-md'
          )}
        >
          <IoIosRedo />
        </button>
      </div>
    </div>
  );
};

export const AudioEditor = () => {
  const {
    audioBuffer,
    duration,
    selectionStart,
    selectionEnd,
    visibleStartTime,
    visibleEndTime,
    setSelectionStart,
    setSelectionEnd,
    setVisibleStartTime,
    setVisibleEndTime,
    // Re-exported from useAudioPlayer
    seekTo,
    toggleLoopSection,
    getCurrentTime,
    loopType,
    playPause,
  } = useAudioContext();

  const sketchWidthRef = useRef<HTMLDivElement>(null);
  const [_, forceRender] = React.useState(0);

  useEffect(() => {
    // I know this is hacky but p5 is weird
    forceRender((prev) => prev + 1);
  }, []);

  const clampSeekTime = (time: number) => {
    return Math.min(Math.max(time, 0), duration);
  };

  const handleSelectionChange = (start: number | null, end: number | null) => {
    if (loopType === 'section') return;
    const clampedStart = start === null ? null : clampSeekTime(start);
    const clampedEnd = end === null ? null : clampSeekTime(end);
    const hasValues = clampedStart !== null && clampedEnd !== null;
    const sortedStart = hasValues ? Math.min(clampedStart, clampedEnd) : null;
    const sortedEnd = hasValues ? Math.max(clampedStart, clampedEnd) : null;
    setSelectionStart(sortedStart);
    setSelectionEnd(sortedEnd);
  };

  const handleBoundsChange = (start: number, end: number) => {
    setVisibleStartTime(start);
    setVisibleEndTime(end);
  };

  return (
    <div
      className={cn(
        'w-full min-h-full flex flex-col items-center gap-4 p-6 bg-[hsl(224,100%,73%)]'
      )}
    >
      <div className='text-lg font-semibold'>
        Current Time: {getCurrentTime().toFixed(2)}
      </div>
      <Navbar />
      <div
        id='waveform'
        className='w-full bg-[#4665BA] rounded-md shadow p-4 min-h-0'
      >
        <NextReactP5Wrapper
          sketch={WaveformSketch as any}
          audioBuffer={audioBuffer}
          currentTime={getCurrentTime()}
          duration={duration}
          startSelection={selectionStart}
          endSelection={selectionEnd}
          visibleStartTime={visibleStartTime}
          visibleEndTime={visibleEndTime}
          onSeekClick={seekTo}
          seekTo={seekTo}
          onSelectionChange={handleSelectionChange}
          toggleLoop={toggleLoopSection}
          availableWidth={sketchWidthRef.current?.clientWidth ?? 0}
          isLooping={loopType === 'section'}
        />
      </div>
      <div
        id='minimap'
        className='w-full relative bg-[#4665BA] rounded-md shadow p-4 min-h-0'
      >
        <div className='relative w-full h-full'>
          <div ref={sketchWidthRef} className='absolute inset-0' />
          <NextReactP5Wrapper
            sketch={MinimapSketch as any}
            audioBuffer={audioBuffer}
            currentTime={getCurrentTime()}
            startSelection={selectionStart}
            endSelection={selectionEnd}
            visibleStartTime={visibleStartTime}
            visibleEndTime={visibleEndTime}
            onBoundsChange={handleBoundsChange}
            availableWidth={sketchWidthRef.current?.clientWidth ?? 0}
          />
        </div>
      </div>
    </div>
  );
};
