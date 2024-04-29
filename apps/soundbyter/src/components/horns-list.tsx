'use client';

import React from 'react';
import { Card } from './ui/card';
import Image from 'next/image';
import JoeHills from '@/assets/hermits/joehills.jpeg';

type Horn = {
  id: string;
  title: string;
  tagline: string;
};
type HornTileProps = {
  horn: Horn;
};
const HornTile = ({ horn: { tagline } }: HornTileProps) => {
  const [playing, setPlaying] = React.useState(false);

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

const horns: Horn[] = [
  {
    id: '1',
    title: 'Joe Hills',
    tagline: 'Everything about this place...',
  },
  {
    id: '2',
    title: 'Joe Hills',
    tagline: `Don't poison. Poisons are like...`,
  },
  {
    id: '3',
    title: 'Joe Hills',
    tagline: 'What is the difference between music...',
  },
  {
    id: '4',
    title: 'Joe Hills',
    tagline: `It is as though the gods themselves reached down...`,
  },
];

export const HornsList = () => {
  return (
    <Card className='flex w-full flex-col gap-[10px] overflow-hidden rounded-lg border-none bg-[#4665BA] p-[20px] text-white'>
      Popular
      <div className='grid w-full grid-cols-2 gap-[10px]'>
        {horns.map((horn) => (
          <HornTile key={horn.id} horn={horn} />
        ))}
      </div>
    </Card>
  );
};
