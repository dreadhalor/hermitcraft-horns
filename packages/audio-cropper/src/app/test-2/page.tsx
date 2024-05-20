'use client';
import React, { useRef, useState, useEffect } from 'react';
import p5 from 'p5';

const progressColor = 'purple';
const waveColor = 'violet';

const Page = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const p5Ref = useRef<p5 | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const sketch = (p: p5) => {
      p.setup = () => {
        const canvas = p.createCanvas(500, 200);
        canvas.mouseClicked(handleWaveformClick);
        canvas.parent('main');
      };

      p.draw = () => {
        if (!audioBuffer) return;
        drawWaveform(p, audioBuffer);
      };

      p.mouseClicked = handleWaveformClick;
    };

    p5Ref.current = new p5(sketch);

    return () => {
      if (p5Ref.current) {
        p5Ref.current.remove();
      }
    };
  }, [audioBuffer]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const audioContext = new AudioContext();
    const fileReader = new FileReader();

    fileReader.onload = async () => {
      const arrayBuffer = fileReader.result as ArrayBuffer;
      const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);
      setAudioBuffer(decodedAudio);
      setAudioUrl(URL.createObjectURL(file));
      setDuration(decodedAudio.duration);
    };

    fileReader.readAsArrayBuffer(file);
  };

  const drawWaveform = (p: p5, buffer: AudioBuffer) => {
    const audio = audioRef.current;
    if (!audio) return;

    const width = p.width;
    const height = p.height;
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    const progress = audio.currentTime / audio.duration;

    p.background(0);
    p.strokeWeight(1);

    // Draw waveform before playhead
    p.stroke(progressColor);
    for (let i = 0; i < width * progress; i++) {
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

      p.line(i, (1 + min) * amp, i, (1 + max) * amp);
    }

    // Draw waveform after playhead
    p.stroke(waveColor);
    for (let i = Math.ceil(width * progress); i < width; i++) {
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

      p.line(i, (1 + min) * amp, i, (1 + max) * amp);
    }

    // Draw playhead
    p.stroke(progressColor);
    p.line(progress * width, 0, progress * width, height);
  };

  const handleWaveformClick = (event: MouseEvent) => {
    const audio = audioRef.current;
    if (!audio || !p5Ref.current) return;

    const p = p5Ref.current;
    const x = p.mouseX;
    const width = p.width;
    const duration = audio.duration;
    const seekTime = (x / width) * duration;

    audio.currentTime = seekTime;
  };

  return (
    <div
      className='w-full h-full flex flex-col items-center justify-center'
      id='main'
    >
      <input type='file' accept='audio/*' onChange={handleFileUpload} />
      <audio ref={audioRef} src={audioUrl || undefined} controls />
    </div>
  );
};

export default Page;
