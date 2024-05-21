import { P5CanvasInstance } from '@p5-wrapper/react';
import {
  progressColor,
  selectionColor,
  selectionHandleColor,
  waveColor,
} from './constants';
import { AudioContextValue } from './audio-provider';

type WaveformProps = P5CanvasInstance<AudioContextValue> & {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  startSelection: number | null;
  endSelection: number | null;
  isSelectionWaveform: boolean;
  onSeekClick?: (seekTime: number) => void;
  onSelectionChange?: (start: number | null, end: number | null) => void;
  setCurrentTime?: (time: number) => void;
};

export const WaveformSketch = (p5: WaveformProps) => {
  let audioBuffer: AudioBuffer | null = null;
  let currentTime: number = 0;
  let duration: number = 0;
  let startSelection: number | null = null;
  let endSelection: number | null = null;
  let isSelectionWaveform: boolean = false;
  let onSeekClick: ((seekTime: number) => void) | undefined;
  let onSelectionChange:
    | ((start: number | null, end: number | null) => void)
    | undefined;
  let setCurrentTime: ((time: number) => void) | undefined;
  let isSelecting = false;
  let isDraggingPlayhead = false;
  let isDraggingStart = false;
  let isDraggingEnd = false;
  let isDraggingSelection = false;
  let pendingSelectionReset = false;
  let dragOffset = 0;
  let selectionWidth = 0;

  p5.updateWithProps = (props: any) => {
    if (props.audioBuffer) audioBuffer = props.audioBuffer;
    if (props.currentTime !== undefined) currentTime = props.currentTime;
    if (props.duration !== undefined) duration = props.duration;
    if (props.startSelection !== undefined)
      startSelection = props.startSelection;
    if (props.endSelection !== undefined) endSelection = props.endSelection;
    if (props.isSelectionWaveform !== undefined)
      isSelectionWaveform = props.isSelectionWaveform;
    if (props.onSeekClick) onSeekClick = props.onSeekClick;
    if (props.onSelectionChange) onSelectionChange = props.onSelectionChange;
    if (props.setCurrentTime) setCurrentTime = props.setCurrentTime;
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

      // Draw selection handles
      p.fill(selectionHandleColor);
      p.noStroke();
      const handleSize = 4;
      p.rect(
        (startSelection / buffer.duration) * width - handleSize / 2,
        0,
        handleSize,
        height
      );
      p.rect(
        (endSelection / buffer.duration) * width - handleSize / 2,
        0,
        handleSize,
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

  p5.mousePressed = () => {
    if (
      audioBuffer &&
      p5.mouseX >= 0 &&
      p5.mouseX <= p5.width &&
      p5.mouseY >= 0 &&
      p5.mouseY <= p5.height
    ) {
      const clickTime = (p5.mouseX / p5.width) * audioBuffer.duration;
      const handleSize = 10;
      const startSelectionX =
        startSelection !== null
          ? (startSelection / audioBuffer.duration) * p5.width
          : null;
      const endSelectionX =
        endSelection !== null
          ? (endSelection / audioBuffer.duration) * p5.width
          : null;
      const progressX = getCurrentProgress() * p5.width;

      // Check if the playhead is being clicked
      if (Math.abs(p5.mouseX - progressX) < handleSize) {
        isDraggingPlayhead = true;
        return;
      }

      if (startSelection !== null && endSelection !== null) {
        selectionWidth = endSelection - startSelection;
        if (
          startSelectionX !== null &&
          Math.abs(p5.mouseX - startSelectionX) < handleSize
        ) {
          isDraggingStart = true;
        } else if (
          endSelectionX !== null &&
          Math.abs(p5.mouseX - endSelectionX) < handleSize
        ) {
          isDraggingEnd = true;
        } else if (
          startSelectionX !== null &&
          endSelectionX !== null &&
          p5.mouseX > startSelectionX &&
          p5.mouseX < endSelectionX
        ) {
          isDraggingSelection = true;
          dragOffset = p5.mouseX - startSelectionX;
        } else {
          pendingSelectionReset = isSelectionWaveform;
        }
      } else {
        pendingSelectionReset = isSelectionWaveform;
      }
    }
  };

  p5.mouseDragged = () => {
    if (pendingSelectionReset && audioBuffer) {
      const startTime = Math.max(
        0,
        Math.min(
          (p5.mouseX / p5.width) * audioBuffer.duration,
          audioBuffer.duration
        )
      );
      startSelection = startTime;
      endSelection = startTime;
      isSelecting = true;
      pendingSelectionReset = false;
      if (onSelectionChange) {
        onSelectionChange(startSelection, endSelection);
      }
    } else if (isSelecting && onSelectionChange && audioBuffer) {
      const currentTime = Math.max(
        0,
        Math.min(
          (p5.mouseX / p5.width) * audioBuffer.duration,
          audioBuffer.duration
        )
      );
      endSelection = currentTime;
      onSelectionChange(startSelection, endSelection);
    } else if (isDraggingPlayhead && setCurrentTime && audioBuffer) {
      const seekTime = Math.max(
        0,
        Math.min(
          (p5.mouseX / p5.width) * audioBuffer.duration,
          audioBuffer.duration
        )
      );
      setCurrentTime(seekTime);
    } else if (isDraggingStart && onSelectionChange && audioBuffer) {
      const startTime = Math.max(
        0,
        Math.min(
          (p5.mouseX / p5.width) * audioBuffer.duration,
          endSelection !== null ? endSelection : audioBuffer.duration
        )
      );
      startSelection = startTime;
      onSelectionChange(startSelection, endSelection);
    } else if (isDraggingEnd && onSelectionChange && audioBuffer) {
      const endTime = Math.max(
        startSelection !== null ? startSelection : 0,
        Math.min(
          (p5.mouseX / p5.width) * audioBuffer.duration,
          audioBuffer.duration
        )
      );
      endSelection = endTime;
      onSelectionChange(startSelection, endSelection);
    } else if (
      isDraggingSelection &&
      onSelectionChange &&
      audioBuffer &&
      startSelection !== null &&
      endSelection !== null
    ) {
      const startX = Math.max(0, p5.mouseX - dragOffset);
      const endX = startX + (selectionWidth / audioBuffer.duration) * p5.width;
      const newStartTime = Math.max(
        0,
        Math.min(
          (startX / p5.width) * audioBuffer.duration,
          audioBuffer.duration - selectionWidth
        )
      );
      const newEndTime = Math.max(
        newStartTime,
        Math.min((endX / p5.width) * audioBuffer.duration, audioBuffer.duration)
      );
      startSelection = newStartTime;
      endSelection = newEndTime;
      onSelectionChange(startSelection, endSelection);
    }
  };

  p5.mouseReleased = () => {
    if (isSelecting) {
      isSelecting = false;
    }
    if (isDraggingPlayhead) {
      isDraggingPlayhead = false;
    }
    if (isDraggingStart) {
      isDraggingStart = false;
    }
    if (isDraggingEnd) {
      isDraggingEnd = false;
    }
    if (isDraggingSelection) {
      isDraggingSelection = false;
    }
    if (pendingSelectionReset) {
      pendingSelectionReset = false;
    }
  };

  p5.mouseClicked = () => {
    if (
      !isSelecting &&
      !isDraggingPlayhead &&
      !isDraggingStart &&
      !isDraggingEnd &&
      !isDraggingSelection &&
      !pendingSelectionReset &&
      onSeekClick &&
      audioBuffer &&
      p5.mouseX >= 0 &&
      p5.mouseX <= p5.width &&
      p5.mouseY >= 0 &&
      p5.mouseY <= p5.height
    ) {
      const seekTime = Math.max(
        0,
        Math.min(
          (p5.mouseX / p5.width) * audioBuffer.duration,
          audioBuffer.duration
        )
      );
      onSeekClick(seekTime);
      if (setCurrentTime) {
        setCurrentTime(seekTime);
      }
    }
  };
};
