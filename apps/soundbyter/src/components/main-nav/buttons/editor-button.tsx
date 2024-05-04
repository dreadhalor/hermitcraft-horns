'use client';

import { useRouter } from 'next/navigation';
import { FaFilm } from 'react-icons/fa6';

export const EditorButton = () => {
  const router = useRouter();

  return (
    <button
      className='flex items-center justify-center gap-2 border-x hover:bg-gray-100/10'
      onClick={() => router.push('/edit')}
    >
      <FaFilm size={24} />
      <span>Edit</span>
    </button>
  );
};
