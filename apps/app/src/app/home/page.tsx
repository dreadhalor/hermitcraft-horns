import React from 'react';
import Banner from '@/assets/banner.png';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs';
import { HornsList } from '@/components/horn-tile/horns-list';
import { VideosList } from '@/components/videos-list/videos-list';
import Link from 'next/link';

const Home = () => {
  return (
    <main className='flex flex-1 flex-col items-center gap-[20px] p-[20px]'>
      <Image src={Banner} alt='banner' className='w-full' />
      <Link
        href='/about'
        className='my-[-10px] text-sm font-semibold text-[#354B87] hover:underline'
      >
        By Scott Hetrick &rarr;
      </Link>
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
