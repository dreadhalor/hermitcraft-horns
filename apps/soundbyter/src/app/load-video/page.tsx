import { ClipBuilderPane } from './clip-builder/clip-builder-pane';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipMetadataBuilder } from './metadata-builder/clip-metadata-builder';
import { ClipViewer } from './clip-viewer';

const LoadVideoPage = () => {
  return (
    <main className='flex h-full flex-col pb-[20px]'>
      <ClipViewer />
      <Tabs
        className='flex max-h-full w-full flex-1 flex-col'
        defaultValue='metadata'
      >
        <TabsContent value='clip-builder' className='flex-1'>
          <ClipBuilderPane />
        </TabsContent>
        <TabsContent value='metadata' className='flex-1 overflow-auto'>
          <ClipMetadataBuilder />
        </TabsContent>
        <TabsList className='flex w-full gap-2 bg-transparent'>
          <TabsTrigger
            value='clip-builder'
            className='aspect-square h-[20px] rounded-full bg-[#4665BA]/30 p-0 data-[state=active]:bg-[#354B87]'
          />
          <TabsTrigger
            value='metadata'
            className='aspect-square h-[20px] rounded-full bg-[#4665BA]/30 p-0 data-[state=active]:bg-[#354B87]'
          />
        </TabsList>
      </Tabs>
    </main>
  );
};

export default LoadVideoPage;
