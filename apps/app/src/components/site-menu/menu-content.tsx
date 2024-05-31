import React from 'react';
import HermitClockBg from '@/assets/hermitclock-bg.webp';
import HermitClockLogo from '@/assets/hermitclock-logo.svg';
import Image from 'next/image';
import { Noto_Sans } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Button } from '@ui/button';
import {
  FaChevronRight,
  FaGithub,
  FaSquareXTwitter,
  FaX,
} from 'react-icons/fa6';
import { FaCoffee } from 'react-icons/fa';

const hermitClockFont = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-hermitclock',
});

export const MenuContent = () => {
  return (
    <div className='flex w-full flex-col'>
      <a
        href='https://hermitclock.com'
        target='_blank'
        rel='noopener'
        className={cn(
          'relative flex h-[120px] w-full items-center justify-center bg-gray-200 text-white',
          hermitClockFont.variable,
        )}
      >
        <Image
          src={HermitClockBg}
          alt='Hermit Clock'
          layout='fill'
          className='object-cover brightness-75'
        />
        <div className='absolute inset-0 flex flex-col items-center font-bold'>
          {/* <span className='absolute left-0 top-0 w-full bg-black/80 py-1 pl-2 text-[12px]'>
            Love livestreams? Check out:
          </span> */}
          <span className='w-full py-1 pl-2 text-[12px] font-medium text-white/60'>
            For livestreams, check out:
          </span>
          <div className='flex flex-1 flex-col items-center justify-center gap-1 pb-3'>
            <div className='flex gap-2 text-[20px]'>
              <HermitClockLogo className='aspect-square w-[20px]' />
              HermitClock
            </div>
            <p className='max-w-[250px] text-center text-[13px]'>
              See the local time for your favourite Hermitcraft members!
            </p>
          </div>
        </div>
      </a>
      <div className='flex justify-end gap-1 p-1 text-[30px] text-[#3554A9]'>
        <FaCoffee />
        <FaSquareXTwitter />
        <FaGithub />
      </div>

      <Button className='h-[60px] justify-start rounded-none bg-transparent text-black shadow-none hover:bg-[#4665BA] hover:text-white'>
        News
        <FaChevronRight className='ml-auto' />
      </Button>
    </div>
  );
};
