import React from 'react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ui/form';
import { useFormContext } from 'react-hook-form';
import { Input } from '@ui/input';

export const TaglineInput = () => {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name='tagline'
      render={({ field }) => (
        <FormItem>
          <FormLabel>Tagline</FormLabel>
          <FormControl>
            <Input placeholder='tagline' {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
