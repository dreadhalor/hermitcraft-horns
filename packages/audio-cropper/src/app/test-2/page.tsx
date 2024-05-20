'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import p5 from 'p5';
var lamejs = require('lamejs');

const progressColor = 'purple';
const waveColor = 'violet';
const selectionColor = 'rgba(255, 255, 255, 0.3)';

const Page = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const seekP5Ref = useRef<p5 | null>(null);
  const selectionP5Ref = useRef<p5 | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [startSelection, setStartSelection] = useState<number | null>(null);
  const [endSelection, setEndSelection] = useState<number | null>(null);

  const createAudioUrl = (buffer: AudioBuffer): string => {
    const audioContext = new AudioContext();
    const audioSource = audioContext.createBufferSource();
    audioSource.buffer = buffer;

    const destinationNode = audioContext.createMediaStreamDestination();
    audioSource.connect(destinationNode);
    audioSource.start();

    const mediaRecorder = new MediaRecorder(destinationNode.stream);
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event: BlobEvent) => {
      chunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), buffer.duration * 1000);

    return '';
  };

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

  const drawWaveform = useCallback(
    (p: p5, buffer: AudioBuffer, isSeekWaveform: boolean) => {
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

      // Draw selection region
      if (startSelection !== null && endSelection !== null) {
        p.fill(selectionColor);
        p.noStroke();
        p.rect(startSelection, 0, endSelection - startSelection, height);
      }
    },
    [startSelection, endSelection]
  );

  const handleSeekClick = (event: MouseEvent) => {
    const audio = audioRef.current;
    if (!audio || !seekP5Ref.current) return;

    const p = seekP5Ref.current;
    const x = p.mouseX;
    const width = p.width;
    const duration = audio.duration;
    const seekTime = (x / width) * duration;

    audio.currentTime = seekTime;
  };

  const handleSelectionStart = () => {
    const p = selectionP5Ref.current;
    if (!p) return;

    const x = p.mouseX;
    setStartSelection(x);
    setEndSelection(null);
  };

  const handleSelectionEnd = useCallback(() => {
    const p = selectionP5Ref.current;
    if (!p || startSelection === null) return;

    const x = p.mouseX;
    setEndSelection(x);
  }, [startSelection]);

  const handleCropClick = () => {
    if (!audioBuffer || startSelection === null || endSelection === null)
      return;

    const startTime = (startSelection / seekP5Ref.current!.width) * duration;
    const endTime = (endSelection / seekP5Ref.current!.width) * duration;

    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    const newLength = endSample - startSample;

    const newAudioBuffer = new AudioContext().createBuffer(
      audioBuffer.numberOfChannels,
      newLength,
      sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const oldData = audioBuffer.getChannelData(channel);
      const newData = newAudioBuffer.getChannelData(channel);
      for (let i = 0; i < newLength; i++) {
        newData[i] = oldData[i + startSample];
      }
    }

    setAudioBuffer(newAudioBuffer);
    setDuration(newAudioBuffer.duration);
    createAudioUrl(newAudioBuffer);
    setStartSelection(null);
    setEndSelection(null);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const seekSketch = (p: p5) => {
      p.setup = () => {
        const canvas = p.createCanvas(500, 200);
        canvas.mouseClicked(handleSeekClick);
        canvas.parent('seek-waveform');
      };

      p.draw = () => {
        if (!audioBuffer) return;
        drawWaveform(p, audioBuffer, true);
      };
    };

    const selectionSketch = (p: p5) => {
      p.setup = () => {
        const canvas = p.createCanvas(500, 200);
        canvas.mousePressed(handleSelectionStart);
        canvas.mouseReleased(handleSelectionEnd);
        canvas.parent('selection-waveform');
      };

      p.draw = () => {
        if (!audioBuffer) return;
        drawWaveform(p, audioBuffer, false);
      };
    };

    seekP5Ref.current = new p5(seekSketch);
    selectionP5Ref.current = new p5(selectionSketch);

    return () => {
      if (seekP5Ref.current) {
        seekP5Ref.current.remove();
      }
      if (selectionP5Ref.current) {
        selectionP5Ref.current.remove();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioBuffer, audioUrl, drawWaveform, handleSelectionEnd]);

  const downloadAudio = () => {
    if (!audioBuffer) return;

    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const samples = audioBuffer.length;
    const buffers = [];

    for (let channel = 0; channel < channels; channel++) {
      buffers.push(audioBuffer.getChannelData(channel));
    }

    const encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
    const mp3Data = [];
    const chunkSize = 1152;

    // Scale audio data
    const leftBuffer = buffers[0];
    const leftScaled = new Int16Array(leftBuffer.length);
    for (let i = 0; i < leftBuffer.length; i++) {
      leftScaled[i] = leftBuffer[i] * 32767.5;
    }

    const rightScaled =
      channels > 1 ? new Int16Array(buffers[1].length) : leftScaled;
    if (channels > 1) {
      const rightBuffer = buffers[1];
      for (let i = 0; i < rightBuffer.length; i++) {
        rightScaled[i] = rightBuffer[i] * 32767.5;
      }
    }

    for (let i = 0; i < samples; i += chunkSize) {
      const leftChunk = leftScaled.subarray(i, i + chunkSize);
      const rightChunk =
        channels > 1 ? rightScaled.subarray(i, i + chunkSize) : leftChunk;
      const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(new Int8Array(mp3buf));
      }
    }

    const mp3buf = encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(new Int8Array(mp3buf));
    }

    const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
    const url = URL.createObjectURL(mp3Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cropped_audio.mp3';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className='w-full h-full flex flex-col items-center justify-center'>
      <input type='file' accept='audio/*' onChange={handleFileUpload} />
      <audio ref={audioRef} src={audioUrl || undefined} controls />
      <div id='seek-waveform' />
      <div id='selection-waveform' />
      <button onClick={handleCropClick}>Crop</button>
      <button onClick={downloadAudio}>Download</button>
    </div>
  );
};

export default Page;
