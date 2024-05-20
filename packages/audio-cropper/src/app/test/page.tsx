'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';

const Page = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const soundRef = useRef<Howl | null>(null);
  const progressRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const sound = new Howl({
      src: ['wels.mp3'],
      format: ['mp3'],
      onload: () => {
        setDuration(sound.duration());
      },
      onplay: () => {
        setIsPlaying(true);
        requestAnimationFrame(step);
      },
      onpause: () => {
        setIsPlaying(false);
      },
      onend: () => {
        setIsPlaying(false);
        setCurrentTime(0);
      },
      onseek: () => {
        setCurrentTime(sound.seek() as number);
      },
    });

    soundRef.current = sound;

    return () => {
      sound.unload();
    };
  }, []);

  const togglePlayPause = () => {
    if (isPlaying) {
      soundRef.current?.pause();
    } else {
      soundRef.current?.play();
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    const value = parseFloat(target.value);
    const seekTime = (value / 100) * duration;
    soundRef.current?.seek(seekTime);
    setCurrentTime(seekTime);
  };

  const step = () => {
    const sound = soundRef.current;
    if (sound && sound.playing()) {
      setCurrentTime(sound.seek() as number);
      requestAnimationFrame(step);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-screen'>
      <div className='mb-4'>
        <button
          className='px-4 py-2 bg-blue-500 text-white rounded'
          onClick={togglePlayPause}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
      <div className='w-full max-w-md'>
        <input
          type='range'
          className='w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer'
          min='0'
          max='100'
          step='0.01'
          value={(currentTime / duration) * 100}
          onChange={handleSeek}
          ref={progressRef}
        />
        <div className='flex justify-between text-sm text-gray-600 mt-2'>
          <div>{formatTime(currentTime)}</div>
          <div>{formatTime(duration)}</div>
        </div>
      </div>
    </div>
  );
};

export default Page;
