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
import { useApp } from '@/providers/app-provider-client';
import { useDeleteClip } from '@/hooks/use-delete-clip';
import { SheetClose } from '@ui/sheet';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ui/alert-dialog';
import { Horn } from '@/trpc';

interface Props {
  horn: Horn;
}
export const HornEditMenu = ({ horn }: Props) => {
  const { hermits } = useApp();
  const { editClip } = useEditClip();
  const { deleteClip } = useDeleteClip();
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const { hermit, id } = horn!;
  const tagline = horn?.tagline ?? '';
  const season = horn?.season ?? 'none';

  const form = useForm<EditClipFrontendSchema>({
    resolver: zodResolver(editClipFrontendSchema),
    defaultValues: {
      id,
      tagline,
      season,
      hermit: hermits.find(
        (_hermit) => _hermit.ChannelID === hermit?.ChannelID,
      ),
    },
  });

  const onSubmit = async (values: EditClipFrontendSchema) => {
    const { hermit, season, ...rest } = values;
    const backendValues = {
      ...rest,
      hermit: hermit?.ChannelID,
      season: season !== 'none' ? season : '',
    } satisfies EditClipSchema;
    await editClip(backendValues);
    closeRef.current?.click();
  };

  const valid = !!form.getValues('hermit');

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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant='destructive'
                  type='reset'
                  className='w-full brightness-90'
                >
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className='border-0'>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className='text-gray-600'>
                    Deleting this horn is permanent!
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button
                    variant='destructive'
                    onClick={() => deleteClip({ id })}
                  >
                    Delete Horn
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type='submit' className='col-span-3' disabled={!valid}>
              {valid ? 'Save' : 'Select a hermit!'}
            </Button>
            <SheetClose ref={closeRef} className='sr-only' />
          </div>
        </form>
      </Form>
    </>
  );
};
