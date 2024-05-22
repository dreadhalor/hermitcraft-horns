'use client';

import { useSandboxAudioPlayer } from './use-sandbox-audio-player';

const Page = () => {
  const {
    audioBuffer,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    isPlaying,
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
    disableLoops,
  } = useSandboxAudioPlayer();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    loadAudioBuffer(arrayBuffer);
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
    if (loopEnabled) {
      disableLoops();
    } else {
      setLoopEnabled(true);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (!isNaN(time) && time >= 0 && time <= (audioBuffer?.duration || 0)) {
      seekTo(time);
    }
  };

  const handlePlayPauseAudio = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
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
      <div className='flex flex-col items-center'>
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
      <div className='flex gap-2'>
        <button onClick={handlePlayPauseAudio}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={stopAudio}>Stop</button>
        <button onClick={handleLoopToggle}>
          {loopEnabled ? 'Disable Loop' : 'Loop Selection'}
        </button>
        <button onClick={loopAndPlaySection}>Loop and Play Section</button>
        <button onClick={loopAndPlayTrack}>Loop and Play Track</button>
      </div>
      <div>Current Time: {getCurrentTime().toFixed(2)}</div>
    </div>
  );
};

export default Page;
