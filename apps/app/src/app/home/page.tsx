import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs';
import { HornsList } from '@/components/horn-tile/horns-list';
import { VideosList } from '@/components/videos-list/videos-list';
import Link from 'next/link';
import { MenuStuff } from './menu-stuff';
import { FaCoffee } from 'react-icons/fa';
import { FaGithub, FaSquareXTwitter } from 'react-icons/fa6';

const Home = () => {
  return (
    <main className='relative flex flex-1 flex-col items-center gap-[20px] p-[20px]'>
      <MenuStuff />
      <div className='my-[-10px] flex justify-end gap-3 p-1 text-[20px] '>
        <a
          href='https://buymeacoffee.com/dreadhalor'
          target='_blank'
          rel='noopener'
          className='text-[#354B87] transition-transform duration-200 ease-in-out hover:scale-105'
        >
          <FaCoffee />
        </a>
        {/* <FaGithub />
        <FaSquareXTwitter /> */}
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
