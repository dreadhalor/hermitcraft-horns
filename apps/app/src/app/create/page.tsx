'use client';

import { ClipViewer } from './clip-viewer';
import { ClipBuilderTabs } from './clip-builder-tabs';
import { useApp } from '@/providers/app-provider-client';
import { useSearchParams } from 'next/navigation';

const LoadVideoPage = () => {
  const { hermits } = useApp();
  const searchParams = useSearchParams();
  const initialClipStart = searchParams.get('start')
    ? parseFloat(searchParams.get('start')!)
    : undefined;
  const initialClipEnd = searchParams.get('end')
    ? parseFloat(searchParams.get('end')!)
    : undefined;

  return (
    <main className='flex h-full flex-col pb-[20px]'>
      <ClipViewer
        initialClipStart={initialClipStart}
        initialClipEnd={initialClipEnd}
      />
      <ClipBuilderTabs hermits={hermits} />
    </main>
  );
};

export default LoadVideoPage;
