import React from 'react';
import { Card } from './ui/card';
import { HornTile } from './horn-tile';

export type Horn = {
  id: string;
  title: string;
  tagline: string;
  start?: number;
  end?: number;
  video?: string;
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

export const HornsList = async () => {
  const data = await fetch('http://localhost:3000/api/get-clips').then((res) =>
    res.json(),
  );

  console.log('ddddatttaaaa', data);
  const [clip] = data.result;
  const { start, end, video, user } = clip;

  return (
    <Card className='flex w-full flex-col gap-[10px] overflow-hidden rounded-lg border-none bg-[#4665BA] p-[20px] text-white'>
      Popular
      <div className='grid w-full grid-cols-2 gap-[10px]'>
        <HornTile
          horn={{
            start: Number.parseInt(start),
            end: Number.parseInt(end),
            video,
            id: '0',
            title: 'Joe Hills',
            tagline: 'This is a test...',
          }}
        />
        {horns.map((horn) => (
          <HornTile key={horn.id} horn={horn} />
        ))}
      </div>
    </Card>
  );
};
