import React from 'react';
import { SelectHermit } from './select-hermit';
import { trpcServer } from '@/trpc/server';
import { TaglineInput } from './tagline-input';
import { HornPreview } from './horn-preview';

export const ClipMetadataBuilder = async () => {
  const hermits = await trpcServer.getHermitChannels();

  return (
    <div className='flex h-full flex-col'>
      <SelectHermit data={hermits} />
      <TaglineInput />
      <HornPreview />
    </div>
  );
};
