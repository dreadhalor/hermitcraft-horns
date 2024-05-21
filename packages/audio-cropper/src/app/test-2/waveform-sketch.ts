import { P5CanvasInstance } from '@p5-wrapper/react';
import { progressColor, selectionColor, waveColor } from './constants';
import { AudioContextValue } from './audio-provider';

type WaveformProps = P5CanvasInstance<AudioContextValue> & {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  startSelection: number | null;
  endSelection: number | null;
};

export const WaveformSketch = (p5: WaveformProps) => {
  let audioBuffer: AudioBuffer | null = null;
  let currentTime: number = 0;
  let duration: number = 0;
  let startSelection: number | null = null;
  let endSelection: number | null = null;

  p5.updateWithProps = (props: any) => {
    if (props.audioBuffer) audioBuffer = props.audioBuffer;
    if (props.currentTime !== undefined) currentTime = props.currentTime;
    if (props.duration !== undefined) duration = props.duration;
    if (props.startSelection !== undefined)
      startSelection = props.startSelection;
    if (props.endSelection !== undefined) endSelection = props.endSelection;
  };

  p5.setup = () => {
    p5.createCanvas(500, 200);
  };

  p5.draw = () => {
    if (audioBuffer) {
      drawWaveform(p5, audioBuffer);
    }
  };

  const drawWaveform = (p: WaveformProps, buffer: AudioBuffer) => {
    const width = p.width;
    const height = p.height;
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    const progress = getCurrentProgress();

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
      p.rect(
        (startSelection / buffer.duration) * width,
        0,
        ((endSelection - startSelection) / buffer.duration) * width,
        height
      );
    }
  };

  const getCurrentProgress = () => {
    if (audioBuffer) {
      return currentTime / audioBuffer.duration;
    }
    return 0;
  };
};
