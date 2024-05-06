'use client';
import React, { useState } from 'react';
import { Card } from '@ui/card';
import { HornTile } from './horn-tile';
import { trpc } from '@/trpc/client';
import { useHHUser } from '@/providers/user-provider';
import { FaSliders } from 'react-icons/fa6';
import { Button } from '@ui/button';

interface Props {
  id?: string;
}

export const HornsList = ({ id }: Props) => {
  const { user } = useHHUser();
  const [selectedHermitId, setSelectedHermitId] = useState<string | null>(null);

  const { data: clips, isLoading } = trpc.getClips.useQuery({
    userId: user?.id ?? '',
    filterUserId: id,
    hermitId: selectedHermitId ?? undefined,
  });

  const handleFilterClick = () => {
    const hermitId = prompt('Enter the Hermit ID to filter by:');
    if (hermitId) {
      setSelectedHermitId(hermitId);
    } else {
      setSelectedHermitId(null);
    }
  };

  if (isLoading || !clips) {
    return <div>Loading...</div>;
  }

  return (
    <Card className='flex w-full flex-col gap-[10px] overflow-hidden rounded-lg border-none bg-[#4665BA] p-[20px] text-white'>
      <div className='flex items-center justify-between'>
        <span>Popular</span>
        <Button
          onClick={handleFilterClick}
          variant='ghost'
          className='text-white'
        >
          <FaSliders className='mr-2' />
          Filter
        </Button>
      </div>
      <div className='grid w-full grid-cols-2 gap-[10px]'>
        {[...clips].reverse().map((clip: any) => (
          <HornTile key={clip.id} horn={clip} />
        ))}
      </div>
    </Card>
  );
};
