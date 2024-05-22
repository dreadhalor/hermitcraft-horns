'use client';

import { useState, useRef, useEffect } from 'react';

export const useSandboxAudioPlayer = () => {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
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

    if (isPlaying) {
      pauseAudio();
      return;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    const loopStart = startTime;
    const loopEnd = endTime;
    let playStartTime =
      pausedTimeRef.current !== null
        ? pausedTimeRef.current
        : loopEnabled
        ? startTime
        : currentTime >= audioBuffer.duration
        ? 0
        : currentTime;

    if (loopEnabled && playStartTime > loopEnd) {
      playStartTime = loopStart;
    }

    if (loopEnabled) {
      source.loop = true;
      source.loopStart = loopStart;
      source.loopEnd = loopEnd;
    }

    source.start(0, playStartTime);
    sourceRef.current = source;

    const startTimestamp = audioContextRef.current.currentTime;
    setCurrentTime(playStartTime);

    setIsPlaying(true);
    pausedTimeRef.current = null;

    source.onended = () => {
      if (!loopEnabled) {
        setIsPlaying(false);
        setCurrentTime(audioBuffer.duration); // Reset current time to 0 when the track ends
        sourceRef.current = null;
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
          const newTime = playStartTime + elapsed;
          if (newTime >= audioBuffer.duration) {
            setCurrentTime(audioBuffer.duration);
            setIsPlaying(false);
            pausedTimeRef.current = audioBuffer.duration;
            return;
          }
          setCurrentTime(newTime);
        }
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
    setIsPlaying(false);
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
    setTrackEnded(false); // Reset trackEnded when the track is stopped
    pausedTimeRef.current = null;
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  };

  const getCurrentTime = () => {
    if (trackEnded) {
      return audioBuffer?.duration || 0; // Display full duration if the track has ended
    }
    return pausedTimeRef.current !== null ? pausedTimeRef.current : currentTime; // Display paused time if paused
  };

  const loopAndPlaySection = () => {
    if (!audioBuffer || !audioContextRef.current) return;

    if (loopType === 'track') {
      setLoopType('none');
      setLoopEnabled(false);
      pauseAudio();
    }

    if (!isPlaying && loopType !== 'section') {
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
      setTrackEnded(false); // Reset trackEnded when playing starts
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
    } else if (!isPlaying && loopType === 'section') {
      playAudio();
    } else if (isPlaying && loopType !== 'section') {
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
        setTrackEnded(false); // Reset trackEnded when playing starts
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

    if (!isPlaying && loopType !== 'track') {
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
      setTrackEnded(false); // Reset trackEnded when playing starts
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
    } else if (isPlaying && loopType !== 'track') {
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
        setTrackEnded(false); // Reset trackEnded when playing starts
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

  return {
    audioBuffer,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    isPlaying,
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
  };
};
