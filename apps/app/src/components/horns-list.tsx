'use client';

import React from 'react';
import { Card } from './ui/card';
import { HornTile } from './horn-tile';
import { trpcServer } from '@/trpc/server';
import { trpc } from '@/trpc/client';

export type Horn = {
  id: string;
  title: string;
  tagline: string;
  start?: number;
  end?: number;
  video?: string;
  clipUrl?: string;
  profilePic?: string;
  season?: string;
  user: string;
};

interface Props {
  id?: string;
}
export const HornsList = ({ id }: Props) => {
  const { data: clips, isLoading } = trpc.getClips.useQuery({ userId: id });

  if (isLoading || !clips) {
    return <div>Loading...</div>;
  }

  return (
    <Card className='flex w-full flex-col gap-[10px] overflow-hidden rounded-lg border-none bg-[#4665BA] p-[20px] text-white'>
      Popular
      <div className='grid w-full grid-cols-2 gap-[10px]'>
        {[...clips].reverse().map((clip: any) => (
          <HornTile key={clip.id} horn={clip} />
        ))}
      </div>
    </Card>
  );
};
