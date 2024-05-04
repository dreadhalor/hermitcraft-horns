'use client';

import { useRouter } from 'next/navigation';
import { FaCircleUser } from 'react-icons/fa6';

export const ProfileButton = () => {
  const router = useRouter();

  return (
    <button
      className='flex items-center justify-center gap-2 hover:bg-gray-100/10'
      onClick={() => router.push('/profile')}
    >
      <FaCircleUser size={24} />
      <span>Profile</span>
    </button>
  );
};
