'use client';

import React, { useRef } from 'react';
import { ReactP5Wrapper } from '@p5-wrapper/react';
import { downloadAudio } from './audio-utils';
import { WaveformSketch } from './waveform-sketch';
import { MinimapSketch } from './minimap-sketch';
import { useAudioContext } from './audio-provider';
import { FaCropSimple } from 'react-icons/fa6';
import { IoIosRedo, IoMdCut } from 'react-icons/io';
import { FaPlay, FaPause, FaRedoAlt, FaUndoAlt } from 'react-icons/fa';
import { RiRewindStartFill } from 'react-icons/ri';
import LoopSelection from '@/assets/loop-selection.svg';
import Image from 'next/image';
import { MdLoop } from 'react-icons/md';
import { cn } from '@/lib/utils';
import { IoIosUndo } from 'react-icons/io';

const Page = () => {
  const {
    audioBuffer,
    duration,
    selectionStart,
    selectionEnd,
    visibleStartTime,
    visibleEndTime,
    setAudioBuffer,
    setDuration,
    setSelectionStart,
    setSelectionEnd,
    setVisibleStartTime,
    setVisibleEndTime,
    undo,
    canUndo,
    redo,
    canRedo,
    handleCrop,
    handleTrim,
    // Re-exported from useSandboxAudioPlayer
    isPlaying,
    playPause,
    stopAudio,
    seekTo,
    toggleLoopSection,
    toggleLoopTrack,
    getCurrentTime,
    loopType,
    clearSelection,
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

  const handleBoundsChange = (start: number, end: number) => {
    setVisibleStartTime(start);
    setVisibleEndTime(end);
  };

  const hasTrack = audioBuffer !== null;
  const hasSelection = selectionStart !== null && selectionEnd !== null;

  const buttonClass =
    'p-2 rounded-md bg-blue-500 hover:bg-blue-600 transition-colors duration-200';
  const enabledClass = 'text-white';
  const disabledClass =
    'text-gray-400 bg-gray-200 hover:bg-gray-200 cursor-not-allowed';
  const toggledOnClass = 'bg-blue-700 hover:bg-blue-700';

  return (
    <div
      className={cn(
        'w-full min-h-full flex flex-col items-center p-6 space-y-6 bg-[hsl(224,100%,73%)]'
      )}
    >
      <input
        type='file'
        accept='audio/*'
        onChange={handleFileUpload}
        className='p-2 border rounded'
      />
      <div className='flex gap-2'>
        <button
          onClick={stopAudio}
          className={cn(buttonClass, hasTrack ? enabledClass : disabledClass)}
        >
          <RiRewindStartFill />
        </button>
        <button
          onClick={playPause}
          className={cn(buttonClass, hasTrack ? enabledClass : disabledClass)}
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
      </div>
      <div className='flex gap-2'>
        <button
          onClick={clearSelection}
          className={cn(buttonClass, !hasSelection && disabledClass)}
          disabled={selectionStart === null || selectionEnd === null}
        >
          Clear selection
        </button>
        <button
          onClick={toggleLoopSection}
          className={cn(
            buttonClass,
            loopType === 'section' && toggledOnClass,
            !hasSelection && disabledClass
          )}
          disabled={selectionStart === null || selectionEnd === null}
        >
          <Image src={LoopSelection} alt='Loop Selection' className='w-6 h-6' />
        </button>
        <button
          onClick={toggleLoopTrack}
          className={cn(
            buttonClass,
            loopType === 'track' && toggledOnClass,
            hasTrack ? enabledClass : disabledClass
          )}
        >
          <MdLoop />
        </button>
      </div>
      <div className='flex gap-2'>
        <button
          onClick={handleCropClick}
          className={cn(
            buttonClass,
            hasSelection ? enabledClass : disabledClass,
            'flex items-center gap-2'
          )}
          disabled={!hasSelection}
        >
          <FaCropSimple />
          Crop
        </button>
        <button
          onClick={handleTrimClick}
          className={cn(
            buttonClass,
            hasSelection ? enabledClass : disabledClass,
            'flex items-center gap-2'
          )}
          disabled={!hasSelection}
        >
          <IoMdCut />
          Trim
        </button>
        <button
          onClick={undo}
          className={cn(buttonClass, canUndo ? enabledClass : disabledClass)}
        >
          <IoIosUndo />
        </button>
        <button
          onClick={redo}
          className={cn(buttonClass, canRedo ? enabledClass : disabledClass)}
        >
          <IoIosRedo />
        </button>
      </div>
      <div className='text-lg font-semibold'>
        Current Time: {getCurrentTime().toFixed(2)}
      </div>
      <div
        id='waveform'
        className='w-full bg-[#4665BA] rounded-md shadow mb-4 p-4 min-h-0'
      >
        <ReactP5Wrapper
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
          <ReactP5Wrapper
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
      <button
        onClick={() => downloadAudio(audioBuffer)}
        className={cn(buttonClass, hasTrack ? enabledClass : disabledClass)}
        disabled={!audioBuffer}
      >
        Download
      </button>
    </div>
  );
};

export default Page;
