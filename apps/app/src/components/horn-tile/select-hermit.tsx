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
import { FormControl, FormField, FormItem } from '@/components/ui/form';
import { useFormContext } from 'react-hook-form';
import { FaBan } from 'react-icons/fa6';
import { SelectHermitGrid } from './select-hermit-grid';
import { Separator } from '@ui/separator';

interface Props {
  hermits: Hermit[];
  onSelect?: (hermit: Hermit | null) => void;
  children?: React.ReactNode;
}

export const SelectHermit = ({ hermits, onSelect, children }: Props) => {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name='hermit'
      render={({ field }) => (
        <FormItem className='flex shrink-0 flex-col gap-1'>
          <Sheet>
            <SheetTrigger asChild>
              <FormControl>
                {children || (
                  <Button
                    id='clip-builder-hermit'
                    variant='outline'
                    className='mx-auto flex h-auto w-auto flex-col items-center rounded-md p-1'
                  >
                    <span className='justify-center text-sm'>
                      {field.value?.DisplayName ?? 'Hermit:'}
                    </span>
                    {field.value ? (
                      <img
                        src={field.value?.ProfilePicture}
                        alt={field.value?.DisplayName}
                        className='aspect-square w-[80px]'
                      />
                    ) : (
                      <div className='aspect-square w-[80px] border' />
                    )}
                  </Button>
                )}
              </FormControl>
            </SheetTrigger>
            <SheetContent
              side='bottom'
              className='flex max-h-[90%] rounded-t-2xl border-0 p-0 pt-4'
            >
              <div className='flex max-h-full w-full flex-col'>
                <SheetHeader className='mb-2 px-4 text-start text-sm uppercase text-gray-600'>
                  Horn spoken by
                </SheetHeader>
                <Separator className='mx-4 w-auto bg-gray-600' />
                <div className='flex-1 overflow-auto'>
                  <SelectHermitGrid field={field} onSelect={onSelect} />
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
              </div>
            </SheetContent>
          </Sheet>
        </FormItem>
      )}
    />
  );
};
