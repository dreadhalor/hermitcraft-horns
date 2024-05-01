import React from 'react';
import Banner from '@/assets/banner.png';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HornsList } from '@/components/horns-list';

const Home = () => {
  return (
    <main className='flex flex-col items-center gap-[20px] p-[20px]'>
      <Image src={Banner} alt='banner' className='w-full' />
      <Tabs className='w-full' defaultValue='horns'>
        <TabsList className='grid w-full grid-cols-2 bg-[#4665BA]'>
          <TabsTrigger
            value='horns'
            className='text-muted data-[state=active]:bg-[#354B87] data-[state=active]:text-white'
          >
            Horns
          </TabsTrigger>
          <TabsTrigger
            value='videos'
            className='text-muted data-[state=active]:bg-[#354B87] data-[state=active]:text-white'
          >
            Videos
          </TabsTrigger>
        </TabsList>
        <TabsContent value='horns'>
          <HornsList />
        </TabsContent>
        <TabsContent value='videos'>
          <h1>Videos</h1>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Home;
