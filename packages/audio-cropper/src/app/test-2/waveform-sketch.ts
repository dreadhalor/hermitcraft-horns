import { P5CanvasInstance } from '@p5-wrapper/react';
import {
  progressColor,
  selectionColor,
  waveColor,
  selectionHandleColor,
} from './constants';

type WaveformProps = P5CanvasInstance<any> & {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  startSelection: number | null;
  endSelection: number | null;
  visibleStartTime: number;
  visibleEndTime: number;
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
  let visibleStartTime: number = 0;
  let visibleEndTime: number = 0;
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
  let mouseReleasedInRegion = false;
  let dragStartX = 0;
  const minDragDistance = 10; // Minimum distance to start a selection

  p5.updateWithProps = (props: any) => {
    if (props.audioBuffer) audioBuffer = props.audioBuffer;
    if (props.currentTime !== undefined) currentTime = props.currentTime;
    if (props.duration !== undefined) duration = props.duration;
    if (props.startSelection !== undefined)
      startSelection = props.startSelection;
    if (props.endSelection !== undefined) endSelection = props.endSelection;
    if (props.visibleStartTime !== undefined)
      visibleStartTime = props.visibleStartTime;
    if (props.visibleEndTime !== undefined)
      visibleEndTime = props.visibleEndTime;
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
    const amp = height / 2;

    const startSample = Math.floor(
      (visibleStartTime / buffer.duration) * data.length
    );
    const endSample = Math.ceil(
      (visibleEndTime / buffer.duration) * data.length
    );
    const visibleData = data.slice(startSample, endSample);
    const visibleDataLength = visibleData.length;
    const step = Math.ceil(visibleDataLength / width);

    p.background(0);
    p.strokeWeight(1);

    // Draw waveform lines before and after the playhead
    const progress =
      ((currentTime - visibleStartTime) / (visibleEndTime - visibleStartTime)) *
      width;
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = visibleData[i * step + j];
        if (datum < min) {
          min = datum;
        }
        if (datum > max) {
          max = datum;
        }
      }
      if (i < progress) {
        p.stroke(progressColor);
      } else {
        p.stroke(waveColor);
      }
      p.line(i, (1 + min) * amp, i, (1 + max) * amp);
    }

    // Draw playhead
    p.stroke(progressColor);
    p.line(progress, 0, progress, height);

    // Draw selection region
    if (startSelection !== null && endSelection !== null) {
      p.fill(selectionColor);
      p.noStroke();
      const startX =
        ((startSelection - visibleStartTime) /
          (visibleEndTime - visibleStartTime)) *
        width;
      const endX =
        ((endSelection - visibleStartTime) /
          (visibleEndTime - visibleStartTime)) *
        width;
      p.rect(startX, 0, endX - startX, height);

      // Draw selection handles
      p.fill(selectionHandleColor);
      const handleSize = 4;
      p.rect(startX - handleSize / 2, 0, handleSize, height);
      p.rect(endX - handleSize / 2, 0, handleSize, height);
    }
  };

  const getCurrentProgress = () => {
    if (audioBuffer) {
      return (
        (currentTime - visibleStartTime) / (visibleEndTime - visibleStartTime)
      );
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
      const handleSize = 10;
      const startX =
        (((startSelection !== null ? startSelection : 0) - visibleStartTime) /
          (visibleEndTime - visibleStartTime)) *
        p5.width;
      const endX =
        (((endSelection !== null ? endSelection : 0) - visibleStartTime) /
          (visibleEndTime - visibleStartTime)) *
        p5.width;
      const progressX = getCurrentProgress() * p5.width;

      dragStartX = p5.mouseX;

      if (Math.abs(p5.mouseX - progressX) < handleSize) {
        isDraggingPlayhead = true;
        return;
      }

      if (startSelection !== null && endSelection !== null) {
        selectionWidth = endSelection - startSelection;
        if (Math.abs(p5.mouseX - startX) < handleSize) {
          isDraggingStart = true;
        } else if (Math.abs(p5.mouseX - endX) < handleSize) {
          isDraggingEnd = true;
        } else if (p5.mouseX > startX && p5.mouseX < endX) {
          isDraggingSelection = true;
          dragOffset = p5.mouseX - startX;
        } else {
          pendingSelectionReset = true;
        }
      } else {
        pendingSelectionReset = true;
      }
    }
  };

  p5.mouseDragged = () => {
    if (pendingSelectionReset && audioBuffer) {
      if (Math.abs(p5.mouseX - dragStartX) > minDragDistance) {
        const startTime = Math.max(
          visibleStartTime,
          Math.min(
            visibleEndTime,
            visibleStartTime +
              (p5.mouseX / p5.width) * (visibleEndTime - visibleStartTime)
          )
        );
        startSelection = startTime;
        endSelection = startTime;
        isSelecting = true;
        pendingSelectionReset = false;
        if (onSelectionChange) {
          onSelectionChange(startSelection, endSelection);
        }
      }
    } else if (isSelecting && onSelectionChange && audioBuffer) {
      const currentTime = Math.max(
        visibleStartTime,
        Math.min(
          visibleEndTime,
          visibleStartTime +
            (p5.mouseX / p5.width) * (visibleEndTime - visibleStartTime)
        )
      );
      endSelection = currentTime;
      onSelectionChange(startSelection, endSelection);
    } else if (isDraggingPlayhead && setCurrentTime && audioBuffer) {
      const seekTime = Math.max(
        0,
        Math.min(
          duration,
          visibleStartTime +
            (p5.mouseX / p5.width) * (visibleEndTime - visibleStartTime)
        )
      );
      setCurrentTime(seekTime);
    } else if (isDraggingStart && onSelectionChange && audioBuffer) {
      const startTime = Math.max(
        0,
        Math.min(
          duration,
          visibleStartTime +
            (p5.mouseX / p5.width) * (visibleEndTime - visibleStartTime)
        )
      );
      startSelection = startTime;
      onSelectionChange(startSelection, endSelection);
    } else if (isDraggingEnd && onSelectionChange && audioBuffer) {
      const endTime = Math.max(
        0,
        Math.min(
          duration,
          visibleStartTime +
            (p5.mouseX / p5.width) * (visibleEndTime - visibleStartTime)
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
      const sectionDuration = endSelection - startSelection;
      const newStartX = Math.max(
        0,
        Math.min(
          duration - sectionDuration,
          visibleStartTime +
            ((p5.mouseX - dragOffset) / p5.width) *
              (visibleEndTime - visibleStartTime)
        )
      );
      const newEndX = newStartX + sectionDuration;
      const newStartTime = newStartX;
      const newEndTime = newEndX;
      startSelection = newStartTime;
      endSelection = newEndTime;
      onSelectionChange(startSelection, endSelection);
    }
  };

  p5.mouseReleased = () => {
    mouseReleasedInRegion =
      isSelecting || isDraggingStart || isDraggingEnd || isDraggingSelection;
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
      p5.mouseY <= p5.height &&
      !mouseReleasedInRegion
    ) {
      const seekTime = Math.max(
        0,
        Math.min(
          duration,
          visibleStartTime +
            (p5.mouseX / p5.width) * (visibleEndTime - visibleStartTime)
        )
      );
      onSeekClick(seekTime);
      if (setCurrentTime) {
        setCurrentTime(seekTime);
      }
    }
    mouseReleasedInRegion = false;
  };
};
