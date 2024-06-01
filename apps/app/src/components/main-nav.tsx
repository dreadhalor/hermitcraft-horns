'use client';

import { Tabs, TabsList, TabsTrigger } from '@ui/tabs';
import GoatHornSVG from '@/assets/goat-horn-icon.svg';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaCircleUser, FaFilm } from 'react-icons/fa6';
import { Sheet, SheetContent, SheetTrigger } from '@ui/sheet';
import { Button } from '@ui/button';
import { IoMenu } from 'react-icons/io5';
import { MenuContent } from './site-menu/menu-content';

export const MainNav = () => {
  const pathname = usePathname();
  const getActiveTab = (pathname: string) => {
    switch (pathname) {
      case '/home':
        return 'horns';
      case '/create':
        return 'create';
      case '/profile':
        return 'profile';
      default:
        return '';
    }
  };

  return (
    <div className='sticky bottom-0 left-0 h-[60px] w-full shrink-0 sm:bottom-4 sm:mx-auto sm:mt-4 sm:max-w-lg sm:drop-shadow-md'>
      <Tabs className='h-full w-full' value={getActiveTab(pathname)}>
        <TabsList className='grid h-full w-full grid-cols-[1fr,1fr,1fr,auto] overflow-hidden rounded-none bg-[#4665BA] p-0 sm:rounded-full'>
          <TabsTrigger
            value='horns'
            asChild
            className='flex h-full items-center justify-center gap-2 rounded-none text-muted data-[state=active]:bg-[#354B87] data-[state=active]:text-white'
          >
            <Link href='/home'>
              <GoatHornSVG fill='white' className='h-7 w-7' />
              <span>Home</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger
            value='create'
            asChild
            className='flex h-full items-center justify-center gap-2 rounded-none text-muted data-[state=active]:bg-[#354B87] data-[state=active]:text-white'
          >
            <Link href='/create'>
              <FaFilm size={24} />
              <span>Create</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger
            value='profile'
            asChild
            className='flex h-full items-center justify-center gap-2 rounded-none text-muted data-[state=active]:bg-[#354B87] data-[state=active]:text-white'
          >
            <Link href='/profile'>
              <FaCircleUser size={24} />
              <span>Profile</span>
            </Link>
          </TabsTrigger>
          <Sheet>
            <SheetTrigger asChild>
              <Button className='flex h-full items-center justify-center gap-2 rounded-none bg-transparent px-3 text-muted shadow-none hover:bg-[#3554A9] sm:px-6'>
                <IoMenu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side='right' className='border-0 p-0'>
              <MenuContent />
            </SheetContent>
          </Sheet>
        </TabsList>
      </Tabs>
    </div>
  );
};
