'use client';

import React from 'react';
import { SelectHermit } from './select-hermit';
import { TaglineInput } from './tagline-input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { Label } from '@/components/ui/label';

export const ClipMetadataBuilder = () => {
  const { season, setSeason } = useClipBuilder();

  return (
    <div className='flex h-full flex-col gap-1 px-4'>
      <SelectHermit />
      <TaglineInput />
      <Label htmlFor='clip-builder-season'>Season</Label>
      <Select value={season} onValueChange={setSeason}>
        <SelectTrigger id='clip-builder-season'>
          <SelectValue placeholder='Select season' />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
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
    </div>
  );
};
