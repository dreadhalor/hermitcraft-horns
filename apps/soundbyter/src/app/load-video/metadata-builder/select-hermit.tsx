'use client';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useClipBuilder } from '@/providers/clip-builder-provider';

export const SelectHermit = () => {
  const { hermit, setHermit, hermits } = useClipBuilder();

  return (
    <Drawer nested>
      <DrawerTrigger asChild>
        <Button variant='outline' className='h-auto gap-2'>
          Hermit:&nbsp;
          <div className='flex flex-col items-center p-1'>
            <span className='justify-center text-sm'>
              {hermit?.DisplayName ?? '???'}
            </span>
            {hermit ? (
              <img
                src={hermit.ProfilePicture}
                alt={hermit.DisplayName}
                className='aspect-square w-[100px]'
              />
            ) : (
              <div className='aspect-square w-[100px] bg-gray-300' />
            )}
          </div>
        </Button>
      </DrawerTrigger>
      <DrawerContent className='max-h-[90%] border-0 p-0'>
        <div className='h-full w-full overflow-auto pb-4'>
          <DrawerHeader>
            <DrawerTitle>Select Hermit</DrawerTitle>
            <DrawerDescription>Who is this quote by?</DrawerDescription>
          </DrawerHeader>
          <div className='grid grid-cols-3'>
            {hermits.map((channel) => (
              <DrawerClose asChild key={channel.ChannelID}>
                <button
                  className='flex flex-col items-center rounded-md p-1 hover:bg-gray-100'
                  onClick={() => setHermit(channel)}
                >
                  <span className='justify-center text-sm'>
                    {channel.DisplayName}
                  </span>
                  <img
                    src={channel.ProfilePicture}
                    alt={channel.DisplayName}
                    className='aspect-square w-full'
                  />
                </button>
              </DrawerClose>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
