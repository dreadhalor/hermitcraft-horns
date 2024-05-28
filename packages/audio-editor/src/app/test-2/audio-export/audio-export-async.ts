// export-audio-async.ts
export const exportAudioAsync = (audioBuffer: AudioBuffer): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./audio-export.worker.ts', import.meta.url),
      {
        type: 'module',
      }
    );

    worker.onmessage = (event) => {
      const { mp3Blob } = event.data;
      resolve(mp3Blob);
      worker.terminate();
    };

    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
    };

    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const buffers: Float32Array[] = [];

    for (let channel = 0; channel < channels; channel++) {
      // Make a copy of the channel data
      buffers.push(new Float32Array(audioBuffer.getChannelData(channel)));
    }

    worker.postMessage({ channels, sampleRate, buffers });
  });
};
