'use client';

import Image from 'next/image';
import { Horn } from './horns-list';
import JoeHills from '@/assets/hermits/joehills.jpeg';
import { useState } from 'react';

type HornTileProps = {
  horn: Horn;
};
export const HornTile = ({ horn: { tagline } }: HornTileProps) => {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className='relative aspect-square w-full overflow-hidden rounded-lg bg-[#354B87] text-white'
      onClick={() => setPlaying((prev) => !prev)}
    >
      {playing && (
        <div className='absolute inset-0 rounded-lg border-2 border-white'></div>
      )}
      <div className='absolute inset-0 flex items-center justify-center p-[4px] brightness-[60%]'>
        <div className='relative h-full w-full overflow-hidden rounded-md'>
          <Image
            src={JoeHills}
            alt='joe hills'
            layout='fill'
            objectFit='contain'
          />
        </div>
      </div>
      <div className='absolute inset-0 p-[8px]'>
        <div className='flex h-full w-full flex-col p-[4px]'>
          <div className='flex items-center'>
            <span className='text-[10px]'>dreadhalor</span>
          </div>
          <span className='my-auto text-center text-[12px]'>{tagline}</span>
          <span className='text-center text-[12px]'>View clip &rarr;</span>
        </div>
      </div>
    </div>
  );
};
