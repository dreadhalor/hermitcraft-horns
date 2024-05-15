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
import { DBClip } from '@drizzle/db';
import { SheetClose } from '../ui/sheet';

interface Props {
  horn: DBClip;
}
export const HornEditMenu = ({ horn }: Props) => {
  const { hermits } = useApp();
  const { editClip } = useEditClip();
  const { deleteClip } = useDeleteClip();
  const closeRef = React.useRef<HTMLButtonElement>(null);

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

  const onSubmit = async (values: EditClipFrontendSchema) => {
    const { hermit, ...rest } = values;
    const backendValues = {
      ...rest,
      hermit: hermit?.ChannelID,
    } satisfies EditClipSchema;
    await editClip(backendValues);
    closeRef.current?.click();
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-2 px-4 py-2'
        >
          <div className='flex items-end gap-2'>
            <SelectHermit hermits={hermits} />
            <div className='flex flex-1 flex-col'>
              <TaglineInput />
              <SelectSeason />
            </div>
          </div>
          <div className='grid w-full grid-cols-4 gap-2'>
            <Button type='submit' className='col-span-3'>
              Save
            </Button>
            <SheetClose ref={closeRef} className='sr-only' />
            <Button
              variant='destructive'
              type='reset'
              className='w-full brightness-90'
              onClick={() => deleteClip({ id: horn.id })}
            >
              Delete
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};
