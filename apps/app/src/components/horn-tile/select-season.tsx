'use client';
import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select';
import { FormControl, FormField, FormItem, FormLabel } from '@ui/form';
import { useFormContext } from 'react-hook-form';

interface Props {
  nullable?: boolean;
}
export const SelectSeason = ({ nullable = false }: Props) => {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name='season'
      render={({ field }) => (
        <FormItem>
          <FormLabel>Season</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder='Select season' />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectGroup>
                {nullable && <SelectItem value='all'>All</SelectItem>}
                <SelectItem value='none'>
                  {nullable ? 'None' : 'N/A'}
                </SelectItem>
                <SelectItem value='11'>11</SelectItem>
                <SelectItem value='10'>10</SelectItem>
                <SelectItem value='9'>9</SelectItem>
                <SelectItem value='8'>8</SelectItem>
                <SelectItem value='7'>7</SelectItem>
                <SelectItem value='6'>6</SelectItem>
                <SelectItem value='5'>5</SelectItem>
                <SelectItem value='4'>4</SelectItem>
                <SelectItem value='3'>3</SelectItem>
                <SelectItem value='2'>2</SelectItem>
                <SelectItem value='1'>1</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
};
