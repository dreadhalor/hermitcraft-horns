// src/app/video-processing/page.tsx
'use client';
import { useState } from 'react';
import { useGenerateClip } from '@/hooks/use-generate-clip';

function VideoProcessingComponent() {
  const [videoUrl, setVideoUrl] = useState(
    'https://www.youtube.com/watch?v=IM-Z6hJb4E4',
  );
  const [start, setStart] = useState(1149);
  const [end, setEnd] = useState(1155);

  const { extractAudio, uploadResponse, isLoading, error } = useGenerateClip();

  const handleExtractAudio = () => {
    extractAudio({ videoUrl, start, end });
  };

  return (
    <div>
      <input
        type='text'
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        placeholder='Video URL'
      />
      <input
        type='number'
        value={start}
        onChange={(e) => setStart(Number(e.target.value))}
        placeholder='Start Time'
      />
      <input
        type='number'
        value={end}
        onChange={(e) => setEnd(Number(e.target.value))}
        placeholder='End Time'
      />
      <button onClick={handleExtractAudio} disabled={isLoading}>
        {isLoading ? 'Extracting...' : 'Extract Audio'}
      </button>
      {uploadResponse && (
        <div>
          <p>Upload Response:</p>
          <pre>{JSON.stringify(uploadResponse, null, 2)}</pre>
        </div>
      )}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}

export default VideoProcessingComponent;
