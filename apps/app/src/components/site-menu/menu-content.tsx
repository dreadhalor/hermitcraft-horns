import React from 'react';
import HermitClockBg from '@/assets/hermitclock-bg.webp';
import HermitClockLogo from '@/assets/hermitclock-logo.svg';
import Image from 'next/image';
import { Noto_Sans } from 'next/font/google';
import { cn } from '@/lib/utils';

const hermitClockFont = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-hermitclock',
});

export const MenuContent = () => {
  return (
    <div className='flex w-full flex-col'>
      {/* <span className='w-full bg-black px-2 py-1 text-[12px] text-white'>
        From our friends:
      </span> */}

      <div
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
      </div>
    </div>
  );
};

// /* HermitClock */

// width: 88px;
// height: 19px;

// font-style: normal;
// font-weight: 700;
// font-size: 14px;
// line-height: 19px;
// /* identical to box height */

// color: #FFFFFF;

// /* Inside auto layout */
// flex: none;
// order: 1;
// flex-grow: 0;
