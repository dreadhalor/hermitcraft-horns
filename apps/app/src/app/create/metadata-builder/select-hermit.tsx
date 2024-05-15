'use client';

import { Button } from '@ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@ui/sheet';
import { Hermit } from '@drizzle/db';
import { FaBan } from 'react-icons/fa6';
import { Separator } from '@ui/separator';
import { cn } from '@/lib/utils';

interface Props {
  hermits: Hermit[];
  hermit: Hermit | null;
  setHermit: (hermit: Hermit | null) => void;
}
export const SelectHermit = ({ hermit, setHermit, hermits }: Props) => {
  return (
    <div className='flex h-auto flex-col gap-1'>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            id='clip-builder-hermit'
            variant='outline'
            className='mx-auto flex h-auto w-auto flex-col items-center rounded-md p-1'
          >
            <span className='justify-center text-sm'>
              {hermit?.DisplayName ?? 'Hermit:'}
            </span>

            {hermit ? (
              <img
                src={hermit?.ProfilePicture}
                alt={hermit?.DisplayName}
                className='aspect-square w-[80px]'
              />
            ) : (
              <div className='aspect-square w-[80px] border' />
            )}
          </Button>
        </SheetTrigger>
        <SheetContent
          side='bottom'
          className='flex max-h-[90%] flex-col gap-0 rounded-t-lg border-0 p-0 pt-2'
        >
          <SheetHeader className='mb-1 px-4 text-start text-sm uppercase text-gray-600'>
            Horn spoken by
          </SheetHeader>
          <Separator className='mx-4 w-auto bg-gray-600' />
          <div className='max-h-full w-full overflow-auto'>
            <div className='grid grid-cols-3'>
              {[null, ...hermits].map((channel) => (
                <SheetClose asChild key={channel?.ChannelID || 'all'}>
                  <Button
                    variant='ghost'
                    className={cn(
                      'flex h-auto w-auto flex-col items-center rounded-md p-1',
                      hermit?.ChannelID === channel?.ChannelID && 'bg-white',
                    )}
                    onClick={() => setHermit(channel)}
                  >
                    <span className='justify-center text-sm'>
                      {channel?.DisplayName ?? 'None'}
                    </span>
                    {channel && (
                      <img
                        src={channel.ProfilePicture}
                        alt={channel.DisplayName}
                        className='aspect-square w-full'
                      />
                    )}
                    {!channel && (
                      <span className='flex flex-1 items-center justify-center text-[#354B87]'>
                        <FaBan size={96} />
                      </span>
                    )}
                  </Button>
                </SheetClose>
              ))}
            </div>
          </div>
          <div className='flex p-2 pt-1'>
            <SheetClose asChild>
              <Button
                variant='outline'
                className='h-[36px] flex-1 gap-2 rounded-full border-gray-600 text-sm hover:bg-[#4665BA] hover:text-white'
              >
                Close
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
