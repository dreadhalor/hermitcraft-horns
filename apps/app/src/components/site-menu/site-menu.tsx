'use client';

import React from 'react';
import { Button } from '@ui/button';
import { IoMenu } from 'react-icons/io5';
import { Sheet, SheetContent, SheetTrigger } from '@ui/sheet';
import { MenuContent } from './menu-content';

interface Props {
  imageRef: React.RefObject<HTMLImageElement>;
}
export const SiteMenu = ({ imageRef }: Props) => {
  // const [top, setTop] = React.useState();
  // React.useLayoutEffect(() => {
  //   setTop((imageRef.current?.getBoundingClientRect().height ?? 0) / 2);
  // }, [imageRef]);

  // console.log('top', top);

  // if (!top) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          className='pointer-events-auto sticky right-0 top-[70px] z-10 ml-auto h-10 w-10 rounded-full bg-[#3554A9] p-0 shadow-md hover:bg-[#354B87] sm:top-[90px]'
          // style={{
          //   marginTop: `${50}px`,
          // }}
        >
          <IoMenu />
        </Button>
      </SheetTrigger>
      <SheetContent side='right' className='border-0 p-0'>
        <MenuContent />
      </SheetContent>
    </Sheet>
  );
};
