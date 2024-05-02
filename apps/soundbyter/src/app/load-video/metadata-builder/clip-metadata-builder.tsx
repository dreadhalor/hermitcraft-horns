import React from 'react';
import { SelectHermit } from './select-hermit';
import { Input } from '@/components/ui/input';
import { trpcServer } from '@/trpc/server';

export const ClipMetadataBuilder = async () => {
  const hermits = await trpcServer.getHermitChannels();

  return (
    <div className='flex h-full flex-col'>
      <SelectHermit data={hermits} />
      <Input placeholder='Title' />
    </div>
  );
};
