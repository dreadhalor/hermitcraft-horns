'use client';

import React, { useRef, useState } from 'react';

const Page = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const audioContext = new AudioContext();
    const fileReader = new FileReader();

    fileReader.onload = async () => {
      const arrayBuffer = fileReader.result as ArrayBuffer;
      const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);
      drawWaveform(decodedAudio);
      setAudioUrl(URL.createObjectURL(file));
    };

    fileReader.readAsArrayBuffer(file);
  };

  const drawWaveform = (buffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const width = canvas.width;
    const height = canvas.height;
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    canvasCtx.fillStyle = 'white';
    canvasCtx.fillRect(0, 0, width, height);

    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = 'black';
    canvasCtx.beginPath();

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const datum = data[i * step + j];
        if (datum < min) {
          min = datum;
        }
        if (datum > max) {
          max = datum;
        }
      }

      canvasCtx.lineTo(i, (1 + min) * amp);
      canvasCtx.lineTo(i, (1 + max) * amp);
    }

    canvasCtx.stroke();
  };

  return (
    <div>
      <input type='file' accept='audio/*' onChange={handleFileUpload} />
      <audio ref={audioRef} src={audioUrl || undefined} controls />
      <canvas ref={canvasRef} width='500' height='200' />
    </div>
  );
};

export default Page;
