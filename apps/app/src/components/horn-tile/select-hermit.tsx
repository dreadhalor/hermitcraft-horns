'use client';

import { Button } from '@ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@ui/drawer';
import { Hermit } from '@drizzle/db';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useFormContext } from 'react-hook-form';

interface Props {
  hermits: Hermit[];
}

export const SelectHermit = ({ hermits }: Props) => {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name='hermit'
      render={({ field }) => (
        <FormItem className='flex shrink-0 flex-col gap-1'>
          <Drawer nested>
            <DrawerTrigger asChild>
              <FormControl>
                <Button
                  id='clip-builder-hermit'
                  variant='outline'
                  className='mx-auto flex h-auto w-auto flex-col items-center rounded-md p-1'
                >
                  <span className='justify-center text-sm'>
                    {field.value?.DisplayName ?? 'Hermit:'}
                  </span>
                  <img
                    src={field.value?.ProfilePicture}
                    alt={field.value?.DisplayName}
                    className='aspect-square w-[80px]'
                  />
                </Button>
              </FormControl>
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
                      <Button
                        variant='ghost'
                        className='flex h-auto w-auto flex-col items-center rounded-md p-1'
                        onClick={() => field.onChange(channel)}
                      >
                        <span className='justify-center text-sm'>
                          {channel.DisplayName}
                        </span>
                        <img
                          src={channel.ProfilePicture}
                          alt={channel.DisplayName}
                          className='aspect-square w-full'
                        />
                      </Button>
                    </DrawerClose>
                  ))}
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </FormItem>
      )}
    />
  );
};
