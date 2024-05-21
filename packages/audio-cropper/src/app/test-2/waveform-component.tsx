import React from 'react';
import { ReactP5Wrapper } from '@p5-wrapper/react';
import { useAudioContext } from './audio-provider';
import { WaveformSketch } from './waveform-sketch';

const WaveformComponent = () => {
  const audioContext = useAudioContext();

  return (
    <div id='waveform-container'>
      <ReactP5Wrapper
        sketch={WaveformSketch as any}
        audioBuffer={audioContext.audioBuffer}
        currentTime={audioContext.currentTime}
        duration={audioContext.duration}
        startSelection={audioContext.startSelection}
        endSelection={audioContext.endSelection}
      />
    </div>
  );
};

export default WaveformComponent;
