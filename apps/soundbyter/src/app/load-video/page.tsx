'use client';
import React, { useState, useRef } from 'react';
import ReactPlayer from 'react-player';

const LoadVideoPage = () => {
  const [inputValue, setInputValue] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const playerRef = useRef<ReactPlayer>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setVideoUrl(inputValue);
    e.preventDefault();
    // TODO: Validate the video URL if needed
  };

  const handleExport = () => {
    if (playerRef.current) {
      const duration = playerRef.current.getDuration();
      if (endTime <= duration) {
        // TODO: Implement the export functionality
        console.log(`Exporting video from ${startTime}s to ${endTime}s`);
      } else {
        console.error('End time exceeds video duration');
      }
    }
  };

  return (
    <div>
      <h1>Load YouTube Video</h1>
      <form onSubmit={handleSubmit}>
        <input
          type='text'
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder='Enter YouTube video URL'
          className='text-black'
        />
        <button type='submit'>Load Video</button>
      </form>
      {videoUrl && (
        <div>
          <ReactPlayer url={videoUrl} controls ref={playerRef} />
          <div>
            <label>Start Time (in seconds):</label>
            <input
              className='text-black'
              type='number'
              value={startTime}
              onChange={(e) => setStartTime(parseFloat(e.target.value))}
              step='0.1'
            />
          </div>
          <div>
            <label>End Time (in seconds):</label>
            <input
              className='text-black'
              type='number'
              value={endTime}
              onChange={(e) => setEndTime(parseFloat(e.target.value))}
              step='0.1'
            />
          </div>
          <button onClick={handleExport}>Export</button>
        </div>
      )}
    </div>
  );
};

export default LoadVideoPage;
