import React from 'react';
import HermitClockBg from '@/assets/hermitclock-bg.webp';
import HermitClockLogo from '@/assets/hermitclock-logo.svg';
import Image from 'next/image';
import { Noto_Sans } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@ui/button';
import {
  FaChevronRight,
  FaCircleUser,
  FaFilm,
  FaFire,
  FaGithub,
  FaSquareXTwitter,
  FaYoutube,
} from 'react-icons/fa6';
import { MdNewReleases, MdPrivacyTip } from 'react-icons/md';
import { IoPizzaSharp } from 'react-icons/io5';
import { FaCoffee, FaRandom } from 'react-icons/fa';
import { IoChatboxEllipses } from 'react-icons/io5';
import Link from 'next/link';
import GoatHornSVG from '@/assets/goat-horn-icon.svg';
import { usePathname, useRouter } from 'next/navigation';

const hermitClockFont = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-hermitclock',
});

const MenuSectionHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <span className={cn('px-4 text-[20px] font-bold text-white', className)}>
      {children}
    </span>
  );
};
const MenuLinkItem = ({
  children,
  href,
  className,
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
}) => {
  const router = useRouter();
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants(),
        'h-[32px] justify-start rounded-none bg-transparent px-6 text-[16px] text-white shadow-none hover:bg-[#4665BA]',
        className,
      )}
    >
      <div className='flex items-center gap-2'>{children}</div>
      <FaChevronRight className='ml-auto' />
    </Link>
  );
};
const MenuSamePageLinkItem = ({
  children,
  href,
  path,
  className,
}: {
  children: React.ReactNode;
  href: string;
  path: string;
  className?: string;
}) => {
  const pathname = usePathname();
  const useLinkTag = pathname !== path;
  console.log(pathname, path, useLinkTag);

  if (useLinkTag) {
    return (
      <Link
        href={href}
        className={cn(
          buttonVariants(),
          'h-[32px] justify-start rounded-none bg-transparent px-6 text-[16px] text-white shadow-none hover:bg-[#4665BA]',
          className,
        )}
      >
        <div className='flex items-center gap-2'>{children}</div>
        <FaChevronRight className='ml-auto' />
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={cn(
        buttonVariants(),
        'h-[32px] justify-start rounded-none bg-transparent px-6 text-[16px] text-white shadow-none hover:bg-[#4665BA]',
        className,
      )}
    >
      <div className='flex items-center gap-2'>{children}</div>
      <FaChevronRight className='ml-auto' />
    </a>
  );
};

const MenuExternalLinkItem = ({
  children,
  href,
  className,
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
}) => (
  <a
    href={href}
    target='_blank'
    rel='noopener'
    className={cn(
      buttonVariants(),
      'h-[32px] justify-start rounded-none bg-transparent px-6 text-[16px] text-white shadow-none hover:bg-[#4665BA]',
      className,
    )}
  >
    <div className='flex items-center gap-2'>{children}</div>
  </a>
);

const MenuItem = ({ children }: { children: React.ReactNode }) => {
  return (
    <Button className='h-[32px] justify-start rounded-none bg-transparent px-6 text-[16px] text-white shadow-none hover:bg-[#4665BA]'>
      <div className='flex items-center gap-2'>{children}</div>
      <FaChevronRight className='ml-auto' />
    </Button>
  );
};

export const MenuContent = () => {
  return (
    <div className='flex h-full w-full flex-col overflow-auto pb-4 text-white'>
      <a
        href='https://hermitclock.com'
        target='_blank'
        rel='noopener'
        className={cn(
          'relative flex h-[90px] w-full shrink-0 items-center justify-center bg-gray-200 text-white',
          hermitClockFont.variable,
        )}
      >
        <Image
          src={HermitClockBg}
          priority
          alt='Hermit Clock'
          layout='fill'
          className='object-cover brightness-75'
        />
        <div className='absolute inset-0 flex flex-col items-center font-bold'>
          <div className='flex flex-1 flex-col items-center justify-center gap-1 pb-1'>
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
      <MenuSectionHeader className='mt-6'>Pages</MenuSectionHeader>
      <MenuItem>
        <MdNewReleases size={20} />
        What's New
      </MenuItem>
      <MenuLinkItem href='/home'>
        <GoatHornSVG fill='white' className='h-[20px] w-[20px]' />
        Home
      </MenuLinkItem>
      <MenuLinkItem href='/about'>
        <IoChatboxEllipses size={20} />
        About
      </MenuLinkItem>
      <MenuLinkItem href='/create'>
        <FaFilm size={20} />
        Create
      </MenuLinkItem>
      <MenuLinkItem href='/profile'>
        <FaCircleUser size={20} />
        Profile
      </MenuLinkItem>
      <MenuSectionHeader className='mt-4'>Explore</MenuSectionHeader>
      <MenuSamePageLinkItem href='/home?sort=most_liked' path='/home'>
        <FaFire />
        Popular Horns
      </MenuSamePageLinkItem>
      <MenuLinkItem href='/horn/random'>
        <FaRandom />
        Random Horn
      </MenuLinkItem>
      <MenuItem>
        <FaYoutube />
        Recent Videos
      </MenuItem>
      <MenuSectionHeader className='mt-4'>Socials</MenuSectionHeader>
      <MenuExternalLinkItem href='https://www.scottjhetrick.com'>
        <IoPizzaSharp size={20} />
        Portfolio
      </MenuExternalLinkItem>
      <MenuExternalLinkItem href='https://www.x.com/dreadhalor'>
        <FaSquareXTwitter size={20} />X / Twitter
      </MenuExternalLinkItem>
      <MenuExternalLinkItem href='https://github.com/dreadhalor/hermitcraft-horns'>
        <FaGithub size={20} />
        GitHub
      </MenuExternalLinkItem>
      <MenuExternalLinkItem href='https://www.buymeacoffee.com/dreadhalor'>
        <FaCoffee size={20} />
        Buy Me A Coffee
      </MenuExternalLinkItem>
      <div className='flex w-full flex-col px-5'>
        <span className='mt-4 text-[14px] font-medium'>
          Hermitcraft Horns is built and maintained by Scott Hetrick, a software
          engineer & avid viewer of HermitCraft.
        </span>
        <span className='mt-2 text-[14px]'>
          Shoutout also goes out to Jack Whitworth, creator of HermitClock, for
          helping me with the design of this menu that I in no way wanted to do.
        </span>
      </div>
    </div>
  );
};
