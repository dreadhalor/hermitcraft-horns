import React from 'react';
import { Card } from './ui/card';
import { HornTile } from './horn-tile';
import { trpcServer } from '@/trpc/server';

export type Horn = {
  id: string;
  title: string;
  tagline: string;
  start?: number;
  end?: number;
  video?: string;
  clipUrl?: string;
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
  const clips = await trpcServer.getClips();

  const mappedClips = clips.map((clip, index) => ({
    start: clip.start,
    end: clip.end,
    video: clip.video,
    user: clip.user,
    id: (index + 10).toString(),
    title: 'Joe Hills',
    tagline: `Test ${index}`,
    clipUrl: clip.clipUrl,
  }));

  return (
    <Card className='flex w-full flex-col gap-[10px] overflow-hidden rounded-lg border-none bg-[#4665BA] p-[20px] text-white'>
      Popular
      <div className='grid w-full grid-cols-2 gap-[10px]'>
        {mappedClips.map((clip: any) => (
          <HornTile key={clip.id} horn={clip} />
        ))}
        {horns.map((horn) => (
          <HornTile key={horn.id} horn={horn} />
        ))}
      </div>
    </Card>
  );
};
