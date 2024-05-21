import { P5CanvasInstance } from '@p5-wrapper/react';
import {
  progressColor,
  selectionColor,
  waveColor,
  selectionHandleColor,
} from './constants';
import { AudioContextValue } from './audio-provider';

type MinimapProps = P5CanvasInstance<AudioContextValue> & {
  audioBuffer: AudioBuffer | null;
  visibleStartTime: number;
  visibleEndTime: number;
  onBoundsChange: (start: number, end: number) => void;
};

export const MinimapSketch = (p5: MinimapProps) => {
  let audioBuffer: AudioBuffer | null = null;
  let visibleStartTime: number = 0;
  let visibleEndTime: number = 0;
  let onBoundsChange: ((start: number, end: number) => void) | undefined;
  let isDraggingStart = false;
  let isDraggingEnd = false;
  let isDraggingSelection = false;
  let dragOffset = 0;
  let selectionWidth = 0;

  p5.updateWithProps = (props: any) => {
    if (props.audioBuffer) audioBuffer = props.audioBuffer;
    if (props.visibleStartTime !== undefined)
      visibleStartTime = props.visibleStartTime;
    if (props.visibleEndTime !== undefined)
      visibleEndTime = props.visibleEndTime;
    if (props.onBoundsChange) onBoundsChange = props.onBoundsChange;
  };

  p5.setup = () => {
    p5.createCanvas(500, 100);
  };

  p5.draw = () => {
    if (audioBuffer) {
      drawWaveform(p5, audioBuffer);
    }
  };

  const drawWaveform = (p: MinimapProps, buffer: AudioBuffer) => {
    const width = p.width;
    const height = p.height;
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    p.background(0);
    p.strokeWeight(1);

    // Draw waveform
    p.stroke(waveColor);
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
      p.line(i, (1 + min) * amp, i, (1 + max) * amp);
    }

    // Draw visible region
    const startX = (visibleStartTime / buffer.duration) * width;
    const endX = (visibleEndTime / buffer.duration) * width;

    p.fill(selectionColor);
    p.noStroke();
    p.rect(startX, 0, endX - startX, height);

    // Draw selection handles
    p.fill(selectionHandleColor);
    const handleSize = 4;
    p.rect(startX - handleSize / 2, 0, handleSize, height);
    p.rect(endX - handleSize / 2, 0, handleSize, height);
  };

  p5.mousePressed = () => {
    if (
      audioBuffer &&
      p5.mouseX >= 0 &&
      p5.mouseX <= p5.width &&
      p5.mouseY >= 0 &&
      p5.mouseY <= p5.height
    ) {
      const handleSize = 10;
      const startX = (visibleStartTime / audioBuffer.duration) * p5.width;
      const endX = (visibleEndTime / audioBuffer.duration) * p5.width;

      selectionWidth = visibleEndTime - visibleStartTime;

      if (Math.abs(p5.mouseX - startX) < handleSize) {
        isDraggingStart = true;
      } else if (Math.abs(p5.mouseX - endX) < handleSize) {
        isDraggingEnd = true;
      } else if (p5.mouseX > startX && p5.mouseX < endX) {
        isDraggingSelection = true;
        dragOffset = p5.mouseX - startX;
      }
    }
  };

  p5.mouseDragged = () => {
    if (isDraggingStart && onBoundsChange && audioBuffer) {
      const startX = Math.max(0, Math.min(p5.mouseX, p5.width));
      const startTime = (startX / p5.width) * audioBuffer.duration;
      onBoundsChange(startTime, visibleEndTime);
    } else if (isDraggingEnd && onBoundsChange && audioBuffer) {
      const endX = Math.max(0, Math.min(p5.mouseX, p5.width));
      const endTime = (endX / p5.width) * audioBuffer.duration;
      onBoundsChange(visibleStartTime, endTime);
    } else if (isDraggingSelection && onBoundsChange && audioBuffer) {
      const startX = Math.max(0, p5.mouseX - dragOffset);
      const endX = startX + (selectionWidth / audioBuffer.duration) * p5.width;
      const startTime = (startX / p5.width) * audioBuffer.duration;
      const endTime = (endX / p5.width) * audioBuffer.duration;
      onBoundsChange(startTime, endTime);
    }
  };

  p5.mouseReleased = () => {
    isDraggingStart = false;
    isDraggingEnd = false;
    isDraggingSelection = false;
  };
};
