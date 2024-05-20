var lamejs = require('lamejs');

export const createAudioUrl = (
  buffer: AudioBuffer,
  callback: (url: string) => void
) => {
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
    callback(url);
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), buffer.duration * 1000);
};

export const downloadAudio = (audioBuffer: AudioBuffer | null) => {
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
