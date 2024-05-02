import { trpc } from '@/trpc/client';
import { Channel } from '@/trpc/routers/hermitcraft';
import React from 'react';
import { SelectHermit } from './select-hermit';
import { Input } from '@/components/ui/input';

export const ClipMetadataBuilder = () => {
  const { data } = trpc.getHermitChannels.useQuery();

  const [hermit, setHermit] = React.useState<Channel | null>(null);

  return (
    <div className='flex h-full flex-col'>
      <SelectHermit data={data} hermit={hermit} setHermit={setHermit} />
      <Input placeholder='Title' />
    </div>
  );
};
