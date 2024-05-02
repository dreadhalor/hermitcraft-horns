'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import React from 'react';

export const TaglineInput = () => {
  const { tagline, setTagline } = useClipBuilder();
  return (
    <>
      <Label htmlFor='clip-builder-tagline'>Tagline</Label>
      <Input
        id='clip-builder-tagline'
        placeholder='What do they say?'
        className='text-[16px]'
        value={tagline}
        onChange={(e) => {
          setTagline(e.target.value);
        }}
      />
    </>
  );
};
