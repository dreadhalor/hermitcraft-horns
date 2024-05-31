'use client';

import { HornTile } from '@/components/horn-tile/horn-tile';
import { Horn } from '@/trpc';
import { Button } from '@ui/button';
import Link from 'next/link';
import { useRef } from 'react';

const RandomHornClient = ({ horn }: { horn: Horn }) => {
  const hornRef = useRef<any>();

  return (
    <>
      <HornTile horn={horn} ref={hornRef} />
      <Button
        className='w-full'
        onClick={() => {
          hornRef.current?.togglePlayback();
        }}
      >
        Play / Stop
      </Button>
      <Link href='/home' className='mt-2 hover:underline'>
        &larr; Back to home
      </Link>
    </>
  );
};

export default RandomHornClient;
