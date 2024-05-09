import React from 'react';
import { Button } from '@ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  EditClipFrontendSchema,
  EditClipSchema,
  editClipFrontendSchema,
} from '@/schemas';
import { Form } from '@ui/form';
import { TaglineInput } from './tagline-input';
import { SelectHermit } from './select-hermit';
import { SelectSeason } from './select-season';
import { useEditClip } from '@/hooks/use-edit-clip';
import { useApp } from '@/providers/app-provider';
import { useDeleteClip } from '@/hooks/use-delete-clip';
import { DrizzleClip } from '@drizzle/db';

interface Props {
  setActiveTab: (tab: string) => void;
  horn: DrizzleClip;
}
export const HornEditMenu = ({ setActiveTab, horn }: Props) => {
  const { hermits } = useApp();
  const { editClip } = useEditClip();
  const { deleteClip } = useDeleteClip();

  const form = useForm<EditClipFrontendSchema>({
    resolver: zodResolver(editClipFrontendSchema),
    defaultValues: {
      id: horn.id,
      tagline: horn.tagline ?? '',
      season: horn.season ?? '',
      hermit: hermits.find(
        (hermit) => hermit.ChannelID === horn.hermit?.ChannelID,
      ),
    },
  });

  const onSubmit = (values: EditClipFrontendSchema) => {
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
        &larr; Back
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
          <Button
            variant='destructive'
            type='reset'
            className='w-full brightness-90'
            onClick={() => deleteClip({ id: horn.id })}
          >
            Delete
          </Button>
        </form>
      </Form>
    </>
  );
};
