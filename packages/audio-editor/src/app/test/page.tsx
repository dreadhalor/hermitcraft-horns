'use client';
import React, { useRef, useEffect } from 'react';
import { useWavesurfer } from '@wavesurfer/react';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

const regionColors = {
  active: 'hsla(240, 50%, 50%, 0.6)',
  inactive: 'hsla(240, 50%, 50%, 0.3)',
};

const formatTime = (seconds: number) => {
  // format to the ms, as this is the precision of the currentTime
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${ms
    .toString()
    .padStart(3, '0')}`;
};

const Page = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { wavesurfer, isPlaying, currentTime } = useWavesurfer({
    container: containerRef,
    height: 200,
    waveColor: 'violet',
    progressColor: 'purple',
    url: 'wels.mp3',
    // dragToSeek: true,
  });
  const [activeRegion, setActiveRegion] = React.useState<any>(null);
  const [wsRegions, setWsRegions] = React.useState<RegionsPlugin | null>(null);

  useEffect(() => {
    if (wsRegions) {
      wsRegions.getRegions().forEach((region: any) => {
        if (region !== activeRegion) {
          region.setOptions({
            color: regionColors.inactive,
          });
        } else {
          region.setOptions({
            color: regionColors.active,
          });
        }
      });
    }
  }, [wsRegions, activeRegion]);

  useEffect(() => {
    if (wavesurfer) {
      if (!wsRegions)
        setWsRegions(wavesurfer.registerPlugin(RegionsPlugin.create()));

      if (!wsRegions) {
        return;
      }

      wsRegions.enableDragSelection({
        color: regionColors.active,
      });

      let isRegionClicked = false;

      wsRegions.on('region-created', (region) => {
        region.on('update', (val) => {
          console.log('region updated', val);
          setActiveRegion(region);
        });
        region.on('click', () => {
          console.log('region click');
        });
        setActiveRegion(region);
      });

      wsRegions.on('region-updated', (region) => {
        console.log('Updated region', region);
      });

      wsRegions.on('region-double-clicked', (region) => {
        console.log('region double clicked', region);
        if (region === activeRegion) {
          setActiveRegion(null);
        }
        region.remove();
      });

      wsRegions.on('region-clicked', (region: any, e: any) => {
        e.stopPropagation(); // prevent triggering a click on the waveform
        isRegionClicked = true;
        setActiveRegion(region);
        // region.play();
      });

      wsRegions.on('region-out', (region: any) => {
        console.log('region-out', region);
        if (activeRegion === region && isRegionClicked) {
          // region.play();
        } else {
          setActiveRegion(null);
          isRegionClicked = false;
        }
      });

      // Reset the active region when the user clicks anywhere in the waveform
      wavesurfer.on('interaction', (f) => {
        console.log('interaction', f);
        // wsRegions.getRegions().forEach((region) => {
        //   if (region !== activeRegion) {
        //     region.remove();
        //   }
        // });
        setActiveRegion(null);
        isRegionClicked = false;
        wavesurfer.pause();
      });
    }
  }, [wavesurfer, wsRegions]);

  const togglePlayPause = () => {
    wavesurfer && wavesurfer.playPause();
  };

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (wavesurfer) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const width = bounds.width;
      const percentage = x / width;
      wavesurfer.seekTo(percentage);
    }
  };

  const exportBlob = () => {
    if (wavesurfer) {
      const data = wavesurfer.getDecodedData();
      if (!data) return;
      // data is of type AudioBuffer
      console.log(data);
      // const blob = new Blob([data.getChannelData(0)], {
      //   type: 'audio/wav',
      // });
      // const url = URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = 'audio.wav';
      // a.click();
      // URL.revokeObjectURL(url);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-screen'>
      <div className='mb-4 flex gap-2'>
        <button
          className='px-4 py-2 bg-blue-500 text-white rounded'
          onClick={togglePlayPause}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          className='px-4 py-2 bg-blue-500 text-white rounded'
          onClick={exportBlob}
        >
          Get blob
        </button>
      </div>
      <div className='w-full max-w-md relative' ref={containerRef} />
      <div className='flex justify-between text-sm text-gray-600 mt-2'>
        <div>{formatTime(currentTime)}</div>
      </div>
    </div>
  );
};

export default Page;
