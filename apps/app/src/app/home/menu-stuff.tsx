'use client';

import React from 'react';
import Image from 'next/image';
import Banner from '@/assets/banner.png';
import { SiteMenu } from '@/components/site-menu/site-menu';

export const MenuStuff = () => {
  const imageRef = React.useRef(null);

  return (
    <>
      <div className='pointer-events-none absolute inset-[20px] flex'>
        <SiteMenu imageRef={imageRef} />
      </div>
      <Image src={Banner} alt='banner' className='w-full' ref={imageRef} />
    </>
  );
};
