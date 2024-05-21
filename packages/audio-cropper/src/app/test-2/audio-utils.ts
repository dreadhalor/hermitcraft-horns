var lamejs = require('lamejs');

export const createAudioUrl = async (
  buffer: AudioBuffer,
  callback: (url: string) => void
) => {
  const audioContext = new AudioContext();
  const offlineContext = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    audioContext.sampleRate
  );
  const source = offlineContext.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineContext.destination);
  source.start();

  const renderedBuffer = await offlineContext.startRendering();
  const wav = await audioBufferToWav(renderedBuffer);
  const blob = new Blob([wav], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  callback(url);
};

// Helper function to convert AudioBuffer to WAV format
const audioBufferToWav = async (buffer: AudioBuffer) => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = PCM, 3 = IEEE Float
  const bitDepth = 16; // 16-bit PCM

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const wavDataBytes = buffer.length * blockAlign;

  const headerBytes = 44;
  const sumBytes = headerBytes + wavDataBytes;

  const arrayBuffer = new ArrayBuffer(sumBytes);
  const view = new DataView(arrayBuffer);

  view.setUint32(0, 1380533830, false); // RIFF chunk descriptor
  view.setUint32(4, sumBytes, true); // Files size
  view.setUint32(8, 1463899717, false); // WAVE
  view.setUint32(12, 1718449184, false); // fmt
  view.setUint32(16, 16, true); // Length of the fmt data
  view.setUint16(20, format, true); // Audio format
  view.setUint16(22, numChannels, true); // Number of channels
  view.setUint32(24, sampleRate, true); // Sample rate
  view.setUint32(28, sampleRate * blockAlign, true); // Byte rate
  view.setUint16(32, blockAlign, true); // Block align
  view.setUint16(34, bitDepth, true); // Bit depth
  view.setUint32(36, 1684108385, false); // data chunk
  view.setUint32(40, wavDataBytes, true); // Size of the data section

  // Write the PCM samples to the view
  const floatTo16BitPCM = (
    input: Float32Array,
    output: DataView,
    offset: number
  ) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  };

  let offset = 44;
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    floatTo16BitPCM(buffer.getChannelData(i), view, offset);
    offset += buffer.length * 2;
  }

  return arrayBuffer;
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

export const cropAudioBuffer = (
  buffer: AudioBuffer,
  startTime: number,
  endTime: number,
  duration: number
) => {
  const sampleRate = buffer.sampleRate;
  const startSample = Math.floor((startTime / duration) * buffer.length);
  const endSample = Math.floor((endTime / duration) * buffer.length);
  const newLength = endSample - startSample;

  const newAudioBuffer = new AudioContext().createBuffer(
    buffer.numberOfChannels,
    newLength,
    sampleRate
  );

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const oldData = buffer.getChannelData(channel);
    const newData = newAudioBuffer.getChannelData(channel);
    for (let i = 0; i < newLength; i++) {
      newData[i] = oldData[i + startSample];
    }
  }

  return newAudioBuffer;
};

export const applyFade = (
  buffer: AudioBuffer,
  fadeInTime: number,
  fadeOutTime: number
) => {
  const sampleRate = buffer.sampleRate;
  const fadeInSamples = Math.floor(fadeInTime * sampleRate);
  const fadeOutSamples = Math.floor(fadeOutTime * sampleRate);

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    const len = channelData.length;

    for (let i = 0; i < fadeInSamples; i++) {
      channelData[i] *= i / fadeInSamples;
    }

    for (let i = len - fadeOutSamples; i < len; i++) {
      channelData[i] *= (len - i) / fadeOutSamples;
    }
  }

  return buffer;
};

export const trimAudioBuffer = (
  buffer: AudioBuffer,
  startTime: number,
  endTime: number,
  duration: number
) => {
  const sampleRate = buffer.sampleRate;
  const startSample = Math.floor((startTime / duration) * buffer.length);
  const endSample = Math.floor((endTime / duration) * buffer.length);

  const newLength = buffer.length - (endSample - startSample);

  const newAudioBuffer = new AudioContext().createBuffer(
    buffer.numberOfChannels,
    newLength,
    sampleRate
  );

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const oldData = buffer.getChannelData(channel);
    const newData = newAudioBuffer.getChannelData(channel);

    let newDataIndex = 0;
    for (let i = 0; i < startSample; i++) {
      newData[newDataIndex++] = oldData[i];
    }
    for (let i = endSample; i < buffer.length; i++) {
      newData[newDataIndex++] = oldData[i];
    }
  }

  return newAudioBuffer;
};
