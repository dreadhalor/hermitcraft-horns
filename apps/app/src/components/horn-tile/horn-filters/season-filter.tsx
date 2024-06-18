'use client';

import React from 'react';
import { Input } from '@ui/input';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@ui/button';
import { SheetClose } from '@ui/sheet';
import { SelectSeason } from '../select-season';

interface Props {
  selectedSeason: string;
  setSelectedSeason: (season: string) => void;
}
interface FormValues {
  season: string;
}
export const SeasonFilter = ({ selectedSeason, setSelectedSeason }: Props) => {
  const form = useForm({
    resolver: zodResolver(z.custom<FormValues>()),
    defaultValues: {
      season: selectedSeason ?? '',
    },
  });
  const closeRef = React.useRef<HTMLButtonElement>(null);

  const onSubmit = (values: FormValues) => {
    setSelectedSeason(values.season);
    closeRef.current?.click();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='flex flex-col gap-2 px-4 py-3'
      >
        <SelectSeason nullable />
        <Button type='submit' className='w-full'>
          Search
        </Button>
        <SheetClose ref={closeRef} className='sr-only' />
      </form>
    </Form>
  );
};
