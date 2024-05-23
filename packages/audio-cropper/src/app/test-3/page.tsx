'use client';
import React from 'react';
import { Range, getTrackBackground } from 'react-range';
import { useSandboxAudioPlayer } from './use-sandbox-audio-player';
import { Slider } from '@/components/ui/slider';

const Page = () => {
  const {
    audioBuffer,
    selectionStart,
    setSelectionStart,
    selectionEnd,
    setSelectionEnd,
    isPlaying,
    loopType,
    loadAudioBuffer,
    stopAudio,
    getCurrentTime,
    seekTo,
    playPause,
    toggleLoopSection,
    toggleLoopTrack,
  } = useSandboxAudioPlayer();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const audioContext = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const decodedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    loadAudioBuffer(decodedAudioBuffer);
  };

  const handleRangeChange = (values: number[]) => {
    const [start, end] = values;
    if (!isNaN(start) && start >= 0 && start <= (audioBuffer?.duration || 0)) {
      setSelectionStart(start);
    } else {
      setSelectionStart(null);
    }
    if (!isNaN(end) && end >= 0 && end <= (audioBuffer?.duration || 0)) {
      setSelectionEnd(end);
    } else {
      setSelectionEnd(null);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (!isNaN(time) && time >= 0 && time <= (audioBuffer?.duration || 0)) {
      seekTo(time);
    }
  };

  return (
    <div className='w-full px-4 h-full flex flex-col items-center justify-center bg-transparent'>
      <input type='file' accept='audio/*' onChange={handleFileUpload} />
      <div className='w-full flex flex-col items-center pt-4'>
        <div>
          Selection:&nbsp;
          {selectionStart !== null && selectionEnd !== null
            ? `${selectionStart.toFixed(2)}s - ${selectionEnd.toFixed(2)}s`
            : 'None'}
        </div>
        <Slider
          className='my-4'
          value={[selectionStart ?? 0, selectionEnd ?? 0]}
          onValueChange={handleRangeChange}
          min={0}
          max={audioBuffer?.duration || 100}
          step={0.1}
        />
        <div className='flex gap-2'>
          <button onClick={playPause}>{isPlaying ? 'Pause' : 'Play'}</button>
          <button onClick={stopAudio}>Stop</button>
          <button
            onClick={toggleLoopSection}
            className={loopType === 'section' ? 'bg-blue-500' : ''}
          >
            Loop Section
          </button>
          <button
            onClick={toggleLoopTrack}
            className={loopType === 'track' ? 'bg-blue-500' : ''}
          >
            Loop Track
          </button>
        </div>
        <div className='flex flex-col items-center my-4'>
          <label>
            Seek To:
            <input
              type='range'
              value={getCurrentTime()}
              onChange={handleSeekChange}
              min='0'
              max={audioBuffer?.duration || 0}
              step='0.01'
              className='w-full'
            />
          </label>
          <div>{getCurrentTime().toFixed(2)}</div>
        </div>
        <div>Current Time: {getCurrentTime().toFixed(2)}</div>
      </div>
    </div>
  );
};

export default Page;
