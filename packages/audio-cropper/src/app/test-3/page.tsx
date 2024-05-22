'use client';

import React, { useState, useRef, useEffect } from 'react';

const Page = () => {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    audioContextRef.current = new AudioContext();
    return () => {
      audioContextRef.current?.close();
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContextRef.current!.decodeAudioData(
      arrayBuffer
    );
    setAudioBuffer(audioBuffer);
    setEndTime(audioBuffer.duration); // Set end time to the duration of the audio initially
  };

  const playAudio = () => {
    if (!audioBuffer || !audioContextRef.current) return;

    if (isPlaying) {
      stopAudio();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    if (loopEnabled) {
      source.loop = true;
      source.loopStart = startTime;
      source.loopEnd = endTime;
    }

    const playStartTime = loopEnabled ? startTime : currentTime;
    source.start(0, playStartTime);
    sourceRef.current = source;

    const startTimestamp = audioContextRef.current.currentTime;
    setCurrentTime(playStartTime);

    setIsPlaying(true);

    source.onended = () => {
      if (!loopEnabled) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    const updateCurrentTime = () => {
      if (sourceRef.current && audioContextRef.current) {
        const elapsed = audioContextRef.current.currentTime - startTimestamp;
        if (loopEnabled) {
          const loopDuration = endTime - startTime;
          const newTime =
            startTime + ((elapsed + playStartTime - startTime) % loopDuration);
          setCurrentTime(newTime);
        } else {
          setCurrentTime(playStartTime + elapsed);
        }
        animationFrameId.current = requestAnimationFrame(updateCurrentTime);
      }
    };

    animationFrameId.current = requestAnimationFrame(updateCurrentTime);
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
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

  const handleLoopToggle = () => {
    setLoopEnabled((prev) => !prev);
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
        <button onClick={playAudio}>{isPlaying ? 'Pause' : 'Play'}</button>
        <button onClick={stopAudio}>Stop</button>
        <button onClick={handleLoopToggle}>
          {loopEnabled ? 'Disable Loop' : 'Loop Selection'}
        </button>
      </div>
      <div>Current Time: {currentTime.toFixed(2)}</div>
    </div>
  );
};

export default Page;
