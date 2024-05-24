'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs';
import React, { useEffect } from 'react';
import { ClipBuilderPane } from './clip-builder/clip-builder-pane';
import { ClipMetadataBuilder } from './metadata-builder/clip-metadata-builder';
import { NextStepButton } from './next-step-button';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import { Hermit } from '@drizzle/db';
import { MAX_CLIP_LENGTH } from '@/lib/utils';
import { useHHUser } from '@/providers/user-provider';
import { ConfirmHorn } from './confirm-horn/confirm-horn';

interface Props {
  hermits: Hermit[];
}
export const ClipBuilderTabs = ({ hermits }: Props) => {
  const [activeTab, setActiveTab] = React.useState('clip-builder');
  const {
    season,
    setSeason,
    hermit,
    setHermit,
    setHermits,
    clipStart,
    clipEnd,
    file,
  } = useClipBuilder();
  const { user } = useHHUser();

  const clipLength = (clipEnd - clipStart) / 1000;
  const disabled = clipLength > MAX_CLIP_LENGTH || !user;

  useEffect(() => {
    setHermits(hermits);
  }, [hermits]);

  return (
    <Tabs
      className='flex max-h-full w-full flex-1 flex-col'
      value={activeTab}
      onValueChange={setActiveTab}
    >
      <TabsContent value='clip-builder' className='flex-1'>
        <ClipBuilderPane />
      </TabsContent>
      <TabsContent value='metadata' className='flex-1 overflow-auto'>
        <ClipMetadataBuilder
          season={season}
          setSeason={setSeason}
          hermit={hermit}
          setHermit={setHermit}
          hermits={hermits}
        />
      </TabsContent>
      <TabsContent value='horn-confirm' className='flex-1 overflow-auto'>
        <ConfirmHorn setActiveTab={setActiveTab} />
      </TabsContent>
      <div className='mx-4 mb-2 mt-4 flex gap-2'>
        <TabsList className='flex gap-2 bg-transparent'>
          <TabsTrigger
            disabled={disabled}
            value='clip-builder'
            className='aspect-square h-[20px] rounded-full bg-[#4665BA]/30 p-0 disabled:bg-[#4665BA]/30 disabled:text-[#354B87] data-[state=active]:bg-[#354B87]'
          />
          <TabsTrigger
            disabled={disabled}
            value='metadata'
            className='aspect-square h-[20px] rounded-full bg-[#4665BA]/30 p-0 disabled:bg-[#4665BA]/30 disabled:text-[#354B87] data-[state=active]:bg-[#354B87]'
          />
          <TabsTrigger
            disabled={disabled || !file}
            value='horn-confirm'
            className='aspect-square h-[20px] rounded-full bg-[#4665BA]/30 p-0 disabled:bg-[#4665BA]/30 disabled:text-[#354B87] data-[state=active]:bg-[#354B87]'
          />
        </TabsList>
        <NextStepButton activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </Tabs>
  );
};
