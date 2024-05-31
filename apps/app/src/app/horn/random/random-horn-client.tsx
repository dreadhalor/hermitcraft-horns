'use client';

import { HornTile } from '@/components/horn-tile/horn-tile';
import { Horn } from '@/trpc';
import { Button } from '@ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

const RandomHornClient = ({ horn }: { horn: Horn }) => {
  const hornRef = useRef<any>();
  const router = useRouter();

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
      <Button
        className='-mt-1 w-full'
        onClick={() => {
          router.refresh();
        }}
      >
        Randomize Horn
      </Button>
      <Link href='/home' className='mt-2 hover:underline'>
        &larr; Back to home
      </Link>
    </>
  );
};

export default RandomHornClient;
