'use client';

import { useRouter } from 'next/navigation';

export const EditorButton = () => {
  const router = useRouter();

  return (
    <button className='border-x' onClick={() => router.push('/edit')}>
      Edit
    </button>
  );
};
