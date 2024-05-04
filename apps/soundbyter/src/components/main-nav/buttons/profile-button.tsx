'use client';

import { useRouter } from 'next/navigation';

export const ProfileButton = () => {
  const router = useRouter();

  return (
    <button className='' onClick={() => router.push('/profile')}>
      Profile
    </button>
  );
};
