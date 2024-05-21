import { useRef, useState, useEffect } from 'react';

export const useAudioPlayer = (
  audioBuffer: AudioBuffer | null,
  startSelection: number | null,
  endSelection: number | null
) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isLooping, setIsLooping] = useState<boolean>(false);
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

  const stopCurrentSource = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  };

  const play = () => {
    if (!audioBuffer || !audioContextRef.current) return;

    const loopStart = Math.min(startSelection ?? 0, endSelection ?? 0);
    const loopEnd = Math.max(startSelection ?? 0, endSelection ?? 0);

    const startTime = isLooping ? loopStart : currentTime;

    stopCurrentSource();

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    if (isLooping) {
      source.loop = true;
      source.loopStart = loopStart;
      source.loopEnd = loopEnd;
    }

    source.start(0, startTime);
    sourceRef.current = source;

    const startTimestamp = audioContextRef.current.currentTime;

    const updateCurrentTime = () => {
      if (sourceRef.current && audioContextRef.current) {
        const elapsed = audioContextRef.current.currentTime - startTimestamp;
        if (isLooping) {
          const loopDuration = loopEnd - loopStart;
          const newTime = loopStart + (elapsed % loopDuration);
          setCurrentTime(newTime);
        } else {
          setCurrentTime(startTime + elapsed);
        }
        animationFrameId.current = requestAnimationFrame(updateCurrentTime);
      }
    };

    setIsPlaying(true);
    requestAnimationFrame(() => {
      updateCurrentTime();
    });
  };

  const pause = () => {
    stopCurrentSource();
    setIsPlaying(false);
  };

  const stop = () => {
    stopCurrentSource();
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const seekTo = (time: number) => {
    stopCurrentSource();
    setCurrentTime(time);
    if (isPlaying) {
      play();
    }
  };

  const toggleLoop = () => {
    setIsLooping((prev) => !prev);
  };

  const toggleLoopAndPlay = () => {
    if (!isLooping) {
      setTimeout(() => {
        document.getElementById('play-butön')?.click();
      }, 0);
    } else {
      if (isPlaying) stop();
    }
    setIsLooping((prev) => !prev);
  };

  return {
    isPlaying,
    currentTime,
    play,
    pause,
    stop,
    seekTo,
    isLooping,
    setIsLooping,
    toggleLoop,
    toggleLoopAndPlay,
  };
};
