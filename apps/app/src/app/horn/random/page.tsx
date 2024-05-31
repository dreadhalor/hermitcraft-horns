import { trpcServer } from '@/trpc/server';
import React from 'react';
import RandomHornClient from './random-horn-client';
import Image from 'next/image';
import Link from 'next/link';
import Banner from '@/assets/banner.png';

const RandomHornPage = async () => {
  const horn = await trpcServer.getRandomClip();

  return (
    <main className='flex flex-1 flex-col items-center gap-[20px] p-[20px]'>
      <Link href='/home' className='w-full'>
        <Image src={Banner} alt='banner' className='w-full' />
      </Link>
      <Link
        href='/about'
        className='my-[-10px] text-sm font-semibold text-[#354B87] hover:underline'
      >
        By Scott Hetrick &rarr;
      </Link>
      <div className='flex w-full max-w-[250px] flex-1 flex-col items-center justify-center gap-2'>
        {horn ? (
          <RandomHornClient horn={horn} />
        ) : (
          <div className='h-min text-wrap'>
            No horn here, sorry! Try&nbsp;
            <Link href='/home' className='font-semibold hover:underline'>
              going back
            </Link>
            .
          </div>
        )}
      </div>
    </main>
  );
};

export default RandomHornPage;
