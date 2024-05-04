'use client';

import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import GoatHornSVG from '@/assets/goat-horn-icon.svg';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaCircleUser, FaFilm } from 'react-icons/fa6';

export const MainNav = () => {
  const pathname = usePathname();
  const getActiveTab = (pathname: string) => {
    switch (pathname) {
      case '/':
        return 'horns';
      case '/create':
        return 'create';
      case '/profile':
        return 'profile';
      default:
        return 'horns';
    }
  };

  return (
    <div className='sticky bottom-0 left-0 h-[60px] w-full shrink-0'>
      <Tabs className='h-full w-full' value={getActiveTab(pathname)}>
        <TabsList className='grid h-full w-full grid-cols-3 rounded-b-none bg-[#4665BA] pb-0'>
          <TabsTrigger
            value='horns'
            asChild
            className='flex h-full items-center justify-center gap-2 rounded-b-none text-muted data-[state=active]:bg-[#354B87] data-[state=active]:text-white'
          >
            <Link href='/'>
              <GoatHornSVG fill='white' className='h-7 w-7' />
              <span>Home</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger
            value='create'
            asChild
            className='flex h-full items-center justify-center gap-2 rounded-b-none text-muted data-[state=active]:bg-[#354B87] data-[state=active]:text-white'
          >
            <Link href='/create'>
              <FaFilm size={24} />
              <span>Create</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger
            value='profile'
            asChild
            className='flex h-full items-center justify-center gap-2 rounded-b-none text-muted data-[state=active]:bg-[#354B87] data-[state=active]:text-white'
          >
            <Link href='/profile'>
              <FaCircleUser size={24} />
              <span>Profile</span>
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
