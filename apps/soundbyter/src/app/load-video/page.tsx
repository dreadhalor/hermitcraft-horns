'use client';

import { cn } from '@/lib/utils';
import { ClipBuilderPane } from './clip-builder-pane';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const LoadVideoPage = () => {
  return (
    <main className='flex h-full flex-col pb-[20px]'>
      <Tabs className='flex w-full flex-1 flex-col' defaultValue='clip-builder'>
        <TabsContent
          value='clip-builder'
          className={cn('flex flex-1 flex-col')}
        >
          <ClipBuilderPane />
        </TabsContent>
        <TabsContent value='videos' className='flex-1'>
          <h1 className='flex flex-1 items-center justify-center'>Videos</h1>
        </TabsContent>
        <TabsList className='flex w-full gap-2 bg-transparent'>
          <TabsTrigger
            value='clip-builder'
            className='aspect-square h-[20px] rounded-full bg-[#4665BA]/30 p-0 data-[state=active]:bg-[#354B87]'
          />
          <TabsTrigger
            value='videos'
            className='aspect-square h-[20px] rounded-full bg-[#4665BA]/30 p-0 data-[state=active]:bg-[#354B87]'
          />
        </TabsList>
      </Tabs>
    </main>
  );
};

export default LoadVideoPage;
