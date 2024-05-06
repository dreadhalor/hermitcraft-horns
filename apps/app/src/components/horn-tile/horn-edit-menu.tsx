import React from 'react';
import { DrawerClose } from '@ui/drawer';
import { Button } from '@ui/button';
import { MdFileDownload } from 'react-icons/md';
import { ClipMetadataBuilder } from '@/app/create/metadata-builder/clip-metadata-builder';
import { useClipEditor } from '@/providers/clip-editor-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  EditClipFrontendSchema,
  EditClipSchema,
  editClipFrontendSchema,
} from '@/schemas';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ui/form';
import { Input } from '@ui/input';
import { TaglineInput } from './tagline-input';
import { SelectHermit } from './select-hermit';
import { TabsTrigger } from '@ui/tabs';
import { SelectSeason } from './select-season';
import { useEditClip } from '@/hooks/use-edit-clip';

interface Props {
  setActiveTab: (tab: string) => void;
  horn: any;
}
export const HornEditMenu = ({ setActiveTab, horn }: Props) => {
  const { hermits } = useClipEditor();
  const { editClip } = useEditClip();

  const form = useForm<EditClipFrontendSchema>({
    resolver: zodResolver(editClipFrontendSchema),
    defaultValues: {
      id: horn.id,
      tagline: horn.tagline,
      season: horn.season,
      hermit: hermits.find(
        (hermit) => hermit.ChannelID === horn.hermit.ChannelID,
      ),
    },
  });

  const onSubmit = (values: EditClipFrontendSchema) => {
    console.log('values:', values);
    const { hermit, ...rest } = values;
    const backendValues = {
      ...rest,
      hermit: hermit?.ChannelID,
    } satisfies EditClipSchema;
    editClip(backendValues);
  };

  return (
    <>
      <Button
        variant='ghost'
        className='text-md h-[60px] w-full gap-2 rounded-none hover:bg-[#4665BA] hover:text-white'
        onClick={() => setActiveTab('main')}
      >
        <MdFileDownload size={22} /> Back
      </Button>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-2 px-4 pb-4'
        >
          <div className='flex items-end gap-2'>
            <SelectHermit hermits={hermits} />
            <div className='flex flex-1 flex-col'>
              <TaglineInput />
              <SelectSeason />
            </div>
          </div>
          <Button type='submit' className='w-full'>
            Submit
          </Button>
        </form>
      </Form>
    </>
  );
};
