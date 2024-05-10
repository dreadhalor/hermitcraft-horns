'use client';

import { ClipViewer } from './clip-viewer';
import { ClipBuilderTabs } from './clip-builder-tabs';
import { useApp } from '@/providers/app-provider';

const LoadVideoPage = () => {
  const { hermits } = useApp();
  return (
    <main className='flex h-full flex-col pb-[20px]'>
      <ClipViewer />
      <ClipBuilderTabs hermits={hermits} />
    </main>
  );
};

export default LoadVideoPage;
