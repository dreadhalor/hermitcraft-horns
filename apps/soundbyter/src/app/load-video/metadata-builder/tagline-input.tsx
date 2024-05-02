'use client';

import { Input } from '@/components/ui/input';
import { useApp } from '@/providers/app-provider';
import React from 'react';

export const TaglineInput = () => {
  const { tagline, setTagline } = useApp();
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
