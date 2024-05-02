'use client';

import { Input } from '@/components/ui/input';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import React from 'react';

export const TaglineInput = () => {
  const { tagline, setTagline } = useClipBuilder();
  return (
    <Input
      placeholder='Title'
      className='text-[16px]'
      value={tagline}
      onChange={(e) => {
        setTagline(e.target.value);
      }}
    />
  );
};
