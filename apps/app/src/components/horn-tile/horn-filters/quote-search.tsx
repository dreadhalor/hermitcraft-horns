'use client';

import React from 'react';
import { Input } from '@ui/input';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@ui/button';
import { SheetClose } from '@ui/sheet';

interface Props {
  selectedQuote: string | null;
  setSelectedQuote: (quote: string | null) => void;
}
interface FormValues {
  quote: string;
}
export const QuoteSearch = ({ selectedQuote, setSelectedQuote }: Props) => {
  const form = useForm({
    resolver: zodResolver(z.custom<FormValues>()),
    defaultValues: {
      quote: selectedQuote ?? '',
    },
  });
  const closeRef = React.useRef<HTMLButtonElement>(null);

  const onSubmit = (values: FormValues) => {
    setSelectedQuote(values.quote);
    closeRef.current?.click();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='flex flex-col gap-2 px-4 py-3'
      >
        <FormField
          control={form.control}
          name='quote'
          render={({ field }) => (
            <FormItem className='flex flex-col gap-2'>
              <FormLabel className='w-min text-right'>Quote</FormLabel>
              <FormControl>
                <Input
                  autoComplete='off'
                  spellCheck={false}
                  placeholder='Search for a quote'
                  {...field}
                  className='py-4'
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type='submit' className='w-full'>
          Search
        </Button>
        <SheetClose ref={closeRef} className='sr-only' />
      </form>
    </Form>
  );
};
