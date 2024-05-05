'use client';

import React from 'react';
import { Card } from './ui/card';
import { HornTile } from './horn-tile';
import { trpc } from '@/trpc/client';
import { useHHUser } from '../providers/user-provider';

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
  liked?: boolean;
};

interface Props {
  id?: string;
}
export const HornsList = ({ id }: Props) => {
  const { user } = useHHUser();
  const { data: clips, isLoading } = trpc.getClips.useQuery({
    userId: user?.id ?? '',
    filterUserId: id,
  });

  if (isLoading || !clips) {
    return <div>Loading...</div>;
  }

  console.log(clips);

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
