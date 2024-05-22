'use client';

import React, { useState } from 'react';
import { useSandboxAudioPlayer } from './use-sandbox-audio-player';

const Page = () => {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  const {
    isPlaying,
    currentTime,
    play,
    pause,
    stop,
    handleLoopToggle,
    loopEnabled,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
  } = useSandboxAudioPlayer(audioBuffer);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await new AudioContext().decodeAudioData(arrayBuffer);
    setAudioBuffer(audioBuffer);
    setEndTime(audioBuffer.duration); // Set end time to the duration of the audio initially
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (!isNaN(time) && time >= 0 && time <= (audioBuffer?.duration || 0)) {
      setStartTime(time);
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (!isNaN(time) && time >= 0 && time <= (audioBuffer?.duration || 0)) {
      setEndTime(time);
    }
  };

  return (
    <div className='w-full h-full flex flex-col items-center justify-center'>
      <input type='file' accept='audio/*' onChange={handleFileUpload} />
      <div className='flex gap-2'>
        <label>
          Start Time:
          <input
            className='text-black'
            type='number'
            value={startTime}
            onChange={handleStartTimeChange}
            min='0'
            max={audioBuffer?.duration || 0}
            step='0.01'
          />
        </label>
        <label>
          End Time:
          <input
            className='text-black'
            type='number'
            value={endTime}
            onChange={handleEndTimeChange}
            min='0'
            max={audioBuffer?.duration || 0}
            step='0.01'
          />
        </label>
      </div>
      <div className='flex gap-2'>
        <button onClick={isPlaying ? pause : play}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={stop}>Stop</button>
        <button onClick={handleLoopToggle}>
          {loopEnabled ? 'Disable Loop' : 'Loop Selection'}
        </button>
      </div>
      <div>Current Time: {currentTime.toFixed(2)}</div>
    </div>
  );
};

export default Page;
