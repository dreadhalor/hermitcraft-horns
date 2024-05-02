import React from 'react';

export const ProgressDots = () => {
  return (
    <div className='mx-auto flex gap-2'>
      <div className='aspect-square h-[20px] rounded-full bg-[#354B87]' />
      <div className='aspect-square h-[20px] rounded-full bg-[#4665BA]/30' />
    </div>
  );
};
