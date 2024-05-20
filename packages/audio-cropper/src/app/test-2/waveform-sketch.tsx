import p5 from 'p5';
import { progressColor, selectionColor, waveColor } from './constants';

export class WaveformSketch {
  private p5Instance: p5;
  private audioBuffer: AudioBuffer | null = null;
  private startSelection: number | null = null;
  private endSelection: number | null = null;
  private dragStartInside = false;

  constructor(
    width: number,
    height: number,
    parent: string,
    private readonly onSeekClick?: (seekTime: number) => void,
    private readonly onSelectionChange?: (
      startTime: number | null,
      endTime: number | null
    ) => void
  ) {
    this.p5Instance = new p5((p: p5) => {
      p.setup = () => {
        const canvas = p.createCanvas(width, height);
        canvas.parent(parent);
        if (onSeekClick) {
          canvas.mouseClicked(this.handleSeekClick);
        }
        if (onSelectionChange) {
          canvas.mousePressed(() => {
            this.dragStartInside = true;
            this.handleSelectionStart();
          });
          canvas.mouseReleased(() => {
            this.dragStartInside = false;
            this.handleSelectionEnd();
          });
          canvas.mouseMoved(() => {
            if (p.mouseIsPressed && this.dragStartInside) {
              this.handleSelectionDrag();
            }
          });
        }
      };

      p.draw = () => {
        if (this.audioBuffer) {
          this.drawWaveform(p, this.audioBuffer);
        }
      };
    });
  }

  public setAudioBuffer(buffer: AudioBuffer) {
    this.audioBuffer = buffer;
  }

  public setSelection(start: number | null, end: number | null) {
    this.startSelection = start;
    this.endSelection = end;
  }

  public remove() {
    this.p5Instance.remove();
  }

  private drawWaveform(p: p5, buffer: AudioBuffer) {
    const width = p.width;
    const height = p.height;
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    const progress = this.getCurrentProgress();

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
    if (this.startSelection !== null && this.endSelection !== null) {
      p.fill(selectionColor);
      p.noStroke();
      p.rect(
        (this.startSelection / buffer.duration) * width,
        0,
        ((this.endSelection - this.startSelection) / buffer.duration) * width,
        height
      );
    }
  }

  private getCurrentProgress() {
    const audio = document.querySelector('audio');
    if (audio && this.audioBuffer) {
      return audio.currentTime / this.audioBuffer.duration;
    }
    return 0;
  }

  private handleSeekClick = () => {
    if (this.onSeekClick && this.audioBuffer) {
      const seekTime =
        (this.p5Instance.mouseX / this.p5Instance.width) *
        this.audioBuffer.duration;
      this.onSeekClick(seekTime);
    }
  };

  private handleSelectionStart = () => {
    if (this.onSelectionChange && this.audioBuffer) {
      const startTime =
        (this.p5Instance.mouseX / this.p5Instance.width) *
        this.audioBuffer.duration;
      this.startSelection = startTime;
      this.endSelection = startTime;
      this.onSelectionChange(this.startSelection, this.endSelection);
    }
  };

  private handleSelectionDrag = () => {
    if (!this.onSelectionChange) return;
    if (this.audioBuffer && this.startSelection !== null) {
      const endTime =
        (this.p5Instance.mouseX / this.p5Instance.width) *
        this.audioBuffer.duration;
      this.endSelection = endTime;
      this.onSelectionChange(this.startSelection, this.endSelection);
    }
  };

  private handleSelectionEnd = () => {
    if (this.onSelectionChange) {
      this.onSelectionChange(this.startSelection, this.endSelection);
    }
  };
}
