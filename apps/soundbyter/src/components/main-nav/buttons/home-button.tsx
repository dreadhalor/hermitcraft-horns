'use client';

import { useRouter } from 'next/navigation';
import GoatHornImage from '@/assets/goat-horn.webp';
import Image from 'next/image';

export const HomeButton = () => {
  const router = useRouter();

  return (
    <button
      className='flex items-center justify-center gap-2 hover:bg-gray-100/10'
      onClick={() => router.push('/')}
    >
      <Image
        src={GoatHornImage}
        width={30}
        height={30}
        alt='goat horn image'
        className='-mt-1'
      />
      <span>Home</span>
    </button>
  );
};
