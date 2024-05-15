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
          className='flex max-h-[90%] flex-col gap-1 rounded-t-2xl border-0 p-0 pb-1 pt-4'
        >
          <div className='max-h-full w-full overflow-auto'>
            <SheetHeader>
              <SheetTitle>Select Hermit</SheetTitle>
              <SheetDescription>Who is this quote by?</SheetDescription>
            </SheetHeader>
            <div className='grid grid-cols-3'>
              {[null, ...hermits].map((channel) => (
                <SheetClose asChild key={channel?.ChannelID || 'all'}>
                  <Button
                    variant='ghost'
                    className='flex h-auto w-auto flex-col items-center rounded-md p-1'
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
          <SheetClose asChild>
            <Button className='mx-1'>Close</Button>
          </SheetClose>
        </SheetContent>
      </Sheet>
    </div>
  );
};
