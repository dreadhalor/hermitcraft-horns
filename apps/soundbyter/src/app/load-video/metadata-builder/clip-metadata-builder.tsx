import React from 'react';
import { SelectHermit } from './select-hermit';
import { TaglineInput } from './tagline-input';

export const ClipMetadataBuilder = () => {
  return (
    <div className='flex h-full flex-col'>
      <SelectHermit />
      <TaglineInput />
    </div>
  );
};
