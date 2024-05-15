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
              <div className='max-h-full w-full overflow-auto'>
                <SheetHeader>
                  <SheetTitle>Select Hermit</SheetTitle>
                  <SheetDescription>Who is this quote by?</SheetDescription>
                </SheetHeader>
                <SelectHermitGrid field={field} onSelect={onSelect} />
              </div>
            </SheetContent>
          </Sheet>
        </FormItem>
      )}
    />
  );
};
