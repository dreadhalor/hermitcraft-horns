import { useApp } from '@/providers/app-provider';
import React from 'react';
import { SheetClose } from '@ui/sheet';
import { Button } from '@ui/button';
import { FaBan } from 'react-icons/fa6';
import { Hermit } from '@drizzle/db';
import { cn } from '@/lib/utils';

interface Props {
  field: {
    value: Hermit | null;
    onChange: (value: Hermit | null) => void;
  };
  onSelect?: (channel: Hermit | null) => void;
  noneLabel?: string;
}
export const SelectHermitGrid = ({ field, onSelect, noneLabel }: Props) => {
  const { hermits } = useApp();

  return (
    <>
      <div className='grid grid-cols-3'>
        {[null, ...hermits].map((channel) => (
          <SheetClose asChild key={channel?.ChannelID || 'none'}>
            <Button
              variant='ghost'
              className={cn(
                'flex h-auto w-auto flex-col items-center rounded-md p-1',
                field.value?.ChannelID === channel?.ChannelID && 'bg-white',
              )}
              onClick={() => {
                field.onChange(channel);
                onSelect?.(channel);
              }}
            >
              <span className='justify-center text-sm'>
                {channel?.DisplayName ?? (noneLabel || 'None')}
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
    </>
  );
};
