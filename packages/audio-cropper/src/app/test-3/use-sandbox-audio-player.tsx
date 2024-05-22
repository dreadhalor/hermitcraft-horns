import { useRef, useState, useEffect } from 'react';

export const useSandboxAudioPlayer = (audioBuffer: AudioBuffer | null) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const pausedTimeRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  useEffect(() => {
    audioContextRef.current = new AudioContext();
    return () => {
      audioContextRef.current?.close();
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const play = () => {
    if (!audioBuffer || !audioContextRef.current) return;

    if (isPlaying) {
      pause();
      return;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    const loopStart = startTime;
    const loopEnd = endTime;
    const playStartTime =
      pausedTimeRef.current !== null
        ? pausedTimeRef.current
        : loopEnabled
        ? startTime
        : currentTime;

    if (loopEnabled) {
      source.loop = true;
      source.loopStart = loopStart;
      source.loopEnd = loopEnd;
    }

    source.start(0, playStartTime);
    sourceRef.current = source;

    const startTimestamp =
      audioContextRef.current.currentTime - (playStartTime - currentTime);
    setIsPlaying(true);
    pausedTimeRef.current = null;

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
          const loopDuration = loopEnd - loopStart;
          const newTime =
            loopStart + ((elapsed + playStartTime - loopStart) % loopDuration);
          setCurrentTime(newTime);
        } else {
          setCurrentTime(playStartTime + elapsed);
        }
        animationFrameId.current = requestAnimationFrame(updateCurrentTime);
      }
    };

    animationFrameId.current = requestAnimationFrame(updateCurrentTime);
  };

  const pause = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setIsPlaying(false);
    pausedTimeRef.current = currentTime;
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  };

  const stop = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    pausedTimeRef.current = null;
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  };

  const handleLoopToggle = () => {
    setLoopEnabled((prev) => !prev);
  };

  return {
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
  };
};
