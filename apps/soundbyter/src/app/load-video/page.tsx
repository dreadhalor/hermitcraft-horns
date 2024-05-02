import { ClipViewer } from './clip-viewer';
import { ClipBuilderTabs } from './clip-builder-tabs';
import { trpcServer } from '@/trpc/server';

const LoadVideoPage = async () => {
  const hermits = await trpcServer.getHermitChannels();

  return (
    <main className='flex h-full flex-col pb-[20px]'>
      <ClipViewer />
      <ClipBuilderTabs hermits={hermits} />
    </main>
  );
};

export default LoadVideoPage;
