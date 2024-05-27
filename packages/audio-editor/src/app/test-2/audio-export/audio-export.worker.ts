// audio-export.worker.ts
import { exportAudio } from './audio-export';

self.onmessage = async (event) => {
  const { channels, sampleRate, buffers } = event.data;
  const mp3Blob = await exportAudio(channels, sampleRate, buffers);
  self.postMessage({ mp3Blob });
};
