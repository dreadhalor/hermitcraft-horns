'use client';

import { useState, useRef, useEffect } from 'react';

export const useSandboxAudioPlayer = () => {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const [exportedIsPlaying, setExportedIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [loopType, setLoopType] = useState<'none' | 'section' | 'track'>(
    'none'
  );
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);
  const [trackEnded, setTrackEnded] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const pausedTimeRef = useRef<number | null>(null);

  const setIsPlaying = (isPlaying: boolean) => {
    isPlayingRef.current = isPlaying;
    setExportedIsPlaying(isPlaying);
  };

  useEffect(() => {
    audioContextRef.current = new AudioContext();
    return () => {
      audioContextRef.current?.close();
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const loadAudioBuffer = async (arrayBuffer: ArrayBuffer) => {
    const audioBuffer = await audioContextRef.current!.decodeAudioData(
      arrayBuffer
    );
    setAudioBuffer(audioBuffer);
    setEndTime(audioBuffer.duration);
  };

  const playAudio = () => {
    if (!audioBuffer || !audioContextRef.current) return;

    if (isPlayingRef.current) return;

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    let playStartTime =
      pausedTimeRef.current !== null ? pausedTimeRef.current : currentTime;

    if (loopType === 'section') {
      const loopStart = startTime;
      const loopEnd = endTime;
      if (playStartTime < loopStart || playStartTime > loopEnd) {
        playStartTime = loopStart;
      }
      source.loop = true;
      source.loopStart = loopStart;
      source.loopEnd = loopEnd;
    } else if (loopType === 'track') {
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = audioBuffer.duration;
    }

    source.start(0, playStartTime);
    sourceRef.current = source;

    const startTimestamp = audioContextRef.current.currentTime;
    setCurrentTime(playStartTime);

    setIsPlaying(true);
    pausedTimeRef.current = null;

    source.onended = () => {
      if (loopType === 'none') {
        setIsPlaying(false);
        setCurrentTime(audioBuffer.duration);
        sourceRef.current = null;
      }
    };

    const updateCurrentTime = () => {
      if (sourceRef.current && audioContextRef.current) {
        const elapsed = audioContextRef.current.currentTime - startTimestamp;
        let newTime = playStartTime + elapsed;

        if (loopType === 'section') {
          const loopStart = startTime;
          const loopEnd = endTime;
          const loopDuration = loopEnd - loopStart;
          newTime = loopStart + ((newTime - loopStart) % loopDuration);
        } else if (loopType === 'track') {
          newTime = newTime % audioBuffer.duration;
        }

        setCurrentTime(newTime);
        animationFrameId.current = requestAnimationFrame(updateCurrentTime);
      }
    };

    animationFrameId.current = requestAnimationFrame(updateCurrentTime);
  };

  const pauseAudio = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    console.log(
      'isPlayingRef.current before (pauseAudio)',
      isPlayingRef.current
    );
    setIsPlaying(false);
    console.log(
      'isPlayingRef.current after (pauseAudio)',
      isPlayingRef.current
    );
    pausedTimeRef.current = currentTime;
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setTrackEnded(false);
    pausedTimeRef.current = null;
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  };

  const getCurrentTime = () => {
    if (trackEnded) {
      return audioBuffer?.duration || 0;
    }
    return pausedTimeRef.current !== null ? pausedTimeRef.current : currentTime;
  };

  const loopAndPlaySection = () => {
    if (!audioBuffer || !audioContextRef.current) return;

    if (loopType === 'track') {
      setLoopType('none');
      setLoopEnabled(false);
      pauseAudio();
    }

    if (!isPlayingRef.current && loopType !== 'section') {
      setLoopType('section');
      setLoopEnabled(true);
      setCurrentTime(startTime);
      pausedTimeRef.current = startTime;
      sourceRef.current?.stop();
      sourceRef.current?.disconnect();
      sourceRef.current = null;

      const source = audioContextRef.current!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current!.destination);
      source.loop = true;
      source.loopStart = startTime;
      source.loopEnd = endTime;
      source.start(0, startTime);
      sourceRef.current = source;

      const startTimestamp = audioContextRef.current!.currentTime;
      setCurrentTime(startTime);
      setIsPlaying(true);
      setTrackEnded(false);
      pausedTimeRef.current = null;

      const updateCurrentTime = () => {
        if (sourceRef.current && audioContextRef.current) {
          const elapsed = audioContextRef.current.currentTime - startTimestamp;
          const loopDuration = endTime - startTime;
          const newTime = startTime + (elapsed % loopDuration);
          setCurrentTime(newTime);
          animationFrameId.current = requestAnimationFrame(updateCurrentTime);
        }
      };

      animationFrameId.current = requestAnimationFrame(updateCurrentTime);
    } else if (!isPlayingRef.current && loopType === 'section') {
      playAudio();
    } else if (isPlayingRef.current && loopType !== 'section') {
      pauseAudio();
      setTimeout(() => {
        setLoopType('section');
        setLoopEnabled(true);
        setCurrentTime(startTime);
        pausedTimeRef.current = startTime;
        sourceRef.current?.stop();
        sourceRef.current?.disconnect();
        sourceRef.current = null;

        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current!.destination);
        source.loop = true;
        source.loopStart = startTime;
        source.loopEnd = endTime;
        source.start(0, startTime);
        sourceRef.current = source;

        const startTimestamp = audioContextRef.current!.currentTime;
        setCurrentTime(startTime);
        setIsPlaying(true);
        setTrackEnded(false);
        pausedTimeRef.current = null;

        const updateCurrentTime = () => {
          if (sourceRef.current && audioContextRef.current) {
            const elapsed =
              audioContextRef.current.currentTime - startTimestamp;
            const loopDuration = endTime - startTime;
            const newTime = startTime + (elapsed % loopDuration);
            setCurrentTime(newTime);
            animationFrameId.current = requestAnimationFrame(updateCurrentTime);
          }
        };

        animationFrameId.current = requestAnimationFrame(updateCurrentTime);
      }, 20);
    }
  };

  const loopAndPlayTrack = () => {
    if (!audioBuffer || !audioContextRef.current) return;

    const trackStartTime = 0;
    const trackEndTime = audioBuffer.duration;

    if (loopType === 'section') {
      setLoopType('none');
      setLoopEnabled(false);
      pauseAudio();
    }

    if (!isPlayingRef.current && loopType !== 'track') {
      setLoopType('track');
      setLoopEnabled(true);
      setCurrentTime(trackStartTime);
      pausedTimeRef.current = trackStartTime;
      sourceRef.current?.stop();
      sourceRef.current?.disconnect();
      sourceRef.current = null;

      const source = audioContextRef.current!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current!.destination);
      source.loop = true;
      source.loopStart = trackStartTime;
      source.loopEnd = trackEndTime;
      source.start(0, trackStartTime);
      sourceRef.current = source;

      const startTimestamp = audioContextRef.current!.currentTime;
      setCurrentTime(trackStartTime);
      setIsPlaying(true);
      setTrackEnded(false);
      pausedTimeRef.current = null;

      const updateCurrentTime = () => {
        if (sourceRef.current && audioContextRef.current) {
          const elapsed = audioContextRef.current.currentTime - startTimestamp;
          const loopDuration = trackEndTime - trackStartTime;
          const newTime = trackStartTime + (elapsed % loopDuration);
          setCurrentTime(newTime);
          animationFrameId.current = requestAnimationFrame(updateCurrentTime);
        }
      };

      animationFrameId.current = requestAnimationFrame(updateCurrentTime);
    } else if (isPlayingRef.current && loopType !== 'track') {
      pauseAudio();
      setTimeout(() => {
        setLoopType('track');
        setLoopEnabled(true);
        setCurrentTime(trackStartTime);
        pausedTimeRef.current = trackStartTime;
        sourceRef.current?.stop();
        sourceRef.current?.disconnect();
        sourceRef.current = null;

        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current!.destination);
        source.loop = true;
        source.loopStart = trackStartTime;
        source.loopEnd = trackEndTime;
        source.start(0, trackStartTime);
        sourceRef.current = source;

        const startTimestamp = audioContextRef.current!.currentTime;
        setCurrentTime(trackStartTime);
        setIsPlaying(true);
        setTrackEnded(false);
        pausedTimeRef.current = null;

        const updateCurrentTime = () => {
          if (sourceRef.current && audioContextRef.current) {
            const elapsed =
              audioContextRef.current.currentTime - startTimestamp;
            const loopDuration = trackEndTime - trackStartTime;
            const newTime = trackStartTime + (elapsed % loopDuration);
            setCurrentTime(newTime);
            animationFrameId.current = requestAnimationFrame(updateCurrentTime);
          }
        };

        animationFrameId.current = requestAnimationFrame(updateCurrentTime);
      }, 20);
    }
  };

  const seekTo = (time: number) => {
    if (time < 0 || (audioBuffer && time > audioBuffer.duration)) {
      console.warn('Invalid seek time');
      return;
    }
    if (isPlayingRef.current) {
      pauseAudio();
      setCurrentTime(time);
      pausedTimeRef.current = time;
      setTimeout(() => {
        playAudio();
      }, 20);
    } else {
      setCurrentTime(time);
      pausedTimeRef.current = time;
    }
  };

  return {
    audioBuffer,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    isPlaying: exportedIsPlaying,
    currentTime,
    loopType,
    loopEnabled,
    setLoopEnabled,
    loadAudioBuffer,
    playAudio,
    pauseAudio,
    stopAudio,
    getCurrentTime,
    loopAndPlaySection,
    loopAndPlayTrack,
    seekTo,
  };
};
