import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';

export const useHowlerProgress = (howl: Howl | null) => {
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);

  const updatePlaybackProgress = () => {
    if (howl && howl.playing()) {
      const duration = howl.duration();
      const seek = howl.seek() as number;
      setPlaybackProgress((seek / duration) * 100);
      animationFrameRef.current = requestAnimationFrame(updatePlaybackProgress);
    }
  };

  useEffect(() => {
    if (howl) {
      const handlePlay = () => {
        updatePlaybackProgress();
      };

      const handlePause = () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      const handleEnd = () => {
        setPlaybackProgress(0);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      howl.on('play', handlePlay);
      howl.on('pause', handlePause);
      howl.on('end', handleEnd);

      return () => {
        howl.off('play', handlePlay);
        howl.off('pause', handlePause);
        howl.off('end', handleEnd);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [howl]);

  return {
    playbackProgress,
    updatePlaybackProgress,
    setPlaybackProgress,
  };
};
