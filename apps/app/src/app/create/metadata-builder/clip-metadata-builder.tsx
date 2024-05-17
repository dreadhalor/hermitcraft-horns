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
} from '@ui/select';
import { Label } from '@ui/label';
import { Hermit } from '@drizzle/db';

interface Props {
  season: string;
  setSeason: (season: string) => void;
  hermit: Hermit | null;
  setHermit: (hermit: Hermit | null) => void;
  hermits: Hermit[];
}
export const ClipMetadataBuilder = ({
  season,
  setSeason,
  hermit,
  setHermit,
  hermits,
}: Props) => {
  return (
    <div className='flex h-full items-start px-4 pt-2'>
      <div className='my-auto flex w-full items-end gap-4'>
        <SelectHermit hermit={hermit} setHermit={setHermit} hermits={hermits} />
        <div className='flex flex-1 flex-col gap-1'>
          <TaglineInput />
          <Label htmlFor='clip-builder-season'>Season</Label>
          <Select
            value={season}
            onValueChange={(v) => setSeason(v !== 'unknown' ? v : '')}
          >
            <SelectTrigger id='clip-builder-season'>
              <SelectValue placeholder='Select season' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value='unknown'>N/A</SelectItem>
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
      </div>
    </div>
  );
};
