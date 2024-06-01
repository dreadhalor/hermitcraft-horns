import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs';
import { HornsList } from '@/components/horn-tile/horns-list';
import { VideosList } from '@/components/videos-list/videos-list';
import Link from 'next/link';
import { FaCoffee } from 'react-icons/fa';
import Image from 'next/image';
import Banner from '@/assets/banner.png';

const Home = () => {
  return (
    <main className='relative flex flex-1 flex-col items-center gap-[20px] p-[20px]'>
      <Image src={Banner} alt='banner' className='w-full' />
      <div className='my-[-10px] flex justify-end gap-3 p-1 text-[20px] '>
        <a
          href='https://buymeacoffee.com/dreadhalor'
          target='_blank'
          rel='noopener'
          className='text-[#354B87] transition-transform duration-200 ease-in-out hover:scale-105'
        >
          <FaCoffee />
        </a>
        <Link
          href='/about'
          className='text-sm font-semibold text-[#354B87] hover:underline'
        >
          By Scott Hetrick &rarr;
        </Link>
      </div>

      <Tabs className='w-full' defaultValue='horns'>
        <TabsList className='mb-2 grid w-full grid-cols-2'>
          <TabsTrigger value='horns'>Horns</TabsTrigger>
          <TabsTrigger value='videos'>Videos</TabsTrigger>
        </TabsList>
        <TabsContent value='horns'>
          <HornsList useParams />
        </TabsContent>
        <TabsContent value='videos'>
          <VideosList />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Home;
