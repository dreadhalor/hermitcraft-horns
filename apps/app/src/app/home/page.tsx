import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs';
import { HornsList } from '@/components/horn-tile/horns-list';
import { VideosList } from '@/components/videos-list/videos-list';
import Link from 'next/link';
import { FaCoffee } from 'react-icons/fa';
import Image from 'next/image';
import Banner from '@/assets/banner.png';

interface NextPageProps {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}
const Home = ({ searchParams }: NextPageProps) => {
  const { tab } = searchParams;

  return (
    <main className='relative flex flex-1 flex-col items-center gap-[20px] p-[20px]'>
      <Image src={Banner} alt='banner' className='w-full' />
      <div className='my-[-10px] flex justify-end gap-3 p-1 text-[20px] '>
        <Link
          href='/about'
          className='text-sm font-semibold text-[#354B87] hover:underline'
        >
          By Scott Hetrick &rarr;
        </Link>
      </div>

      <Tabs
        className='w-full'
        defaultValue={tab === 'videos' ? 'videos' : 'horns'}
      >
        <TabsList className='mb-2 grid w-full grid-cols-2'>
          <TabsTrigger value='horns' asChild>
            <Link href='/home'>Horns</Link>
          </TabsTrigger>
          <TabsTrigger value='videos' asChild>
            <Link href='/home?tab=videos'>Videos</Link>
          </TabsTrigger>
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
