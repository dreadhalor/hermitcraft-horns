'use client';

import { HornTile } from '@/components/horn-tile/horn-tile';
import { Horn } from '@/trpc';
import { Button } from '@ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { FaPlay, FaShuffle } from 'react-icons/fa6';

const RandomHornClient = ({ horn }: { horn: Horn }) => {
  const hornRef = useRef<any>();
  const router = useRouter();

  return (
    <>
      <HornTile horn={horn} ref={hornRef} />
      <Button
        className='w-full gap-2'
        onClick={() => {
          hornRef.current?.togglePlayback();
        }}
      >
        <FaPlay />
        Play / Stop
      </Button>
      <Button
        className='-mt-1 w-full gap-2'
        onClick={() => {
          router.refresh();
        }}
      >
        <FaShuffle />
        Randomize Horn
      </Button>
      <Link href='/home' className='mt-2 hover:underline'>
        &larr; Back to home
      </Link>
    </>
  );
};

export default RandomHornClient;
