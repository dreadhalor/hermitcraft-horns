'use client';

import { useRouter } from 'next/navigation';

export const HomeButton = () => {
  const router = useRouter();

  return (
    <button className='' onClick={() => router.push('/')}>
      Home
    </button>
  );
};
