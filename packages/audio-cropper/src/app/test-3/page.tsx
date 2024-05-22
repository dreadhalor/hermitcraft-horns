'use client';
import { useSandboxAudioPlayer } from './use-sandbox-audio-player';

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
    const arrayBuffer = await file.arrayBuffer();
    loadAudioBuffer(arrayBuffer);
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (!isNaN(time) && time >= 0 && time <= (audioBuffer?.duration || 0)) {
      setSelectionStart(time);
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (!isNaN(time) && time >= 0 && time <= (audioBuffer?.duration || 0)) {
      setSelectionEnd(time);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (!isNaN(time) && time >= 0 && time <= (audioBuffer?.duration || 0)) {
      seekTo(time);
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
            value={selectionStart}
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
            value={selectionEnd}
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
      <div>Current Time: {getCurrentTime().toFixed(2)}</div>
    </div>
  );
};

export default Page;
