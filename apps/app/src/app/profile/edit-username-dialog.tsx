import React from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ui/dialog';
import { Input } from '@ui/input';
import { Button } from '@ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ui/form';
import { useForm } from 'react-hook-form';
import { useHHUser } from '@/providers/user-provider';
import { zodResolver } from '@hookform/resolvers/zod';
import { usernameSchema } from '@/schemas';
import { trpc } from '@/trpc/client';
import { getQueryKey } from '@trpc/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import superjson from 'superjson';

interface ContentProps {
  setOpen: (open: boolean) => void;
}
const EditUsernameDialogContent = ({ setOpen }: ContentProps) => {
  const { user } = useHHUser();
  const form = useForm({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: user?.username ?? '',
    },
  });

  const queryClient = useQueryClient();
  const userQueryKey = getQueryKey(trpc.getUser);
  const clipsQueryKey = getQueryKey(trpc.getPaginatedClips);

  const updateUsernameMutation = trpc.updateUsername.useMutation({
    onSuccess: () => {
      toast.success(
        `Username updated! Nice to meet you, @${form.getValues().username}!`,
      );
      queryClient.invalidateQueries({ queryKey: userQueryKey });
      queryClient.invalidateQueries({ queryKey: clipsQueryKey });
    },
    onSettled: () => setOpen(false),
  });

  const onSubmit = async (values: { username: string }) => {
    // there must be a better way to do this
    const unique = await fetch(
      `/api/trpc/validateUsername?input=${superjson.stringify({ username: values.username })}`,
    )
      .then((res) => res.json())
      // we need to use data.json because superjson wraps the response
      .then((data) => data.result.data.json);
    if (!unique) {
      return form.setError('username', {
        type: 'manual',
        message: 'Username is already taken',
      });
    }

    // update username
    updateUsernameMutation.mutate({
      userId: user?.id ?? '',
      username: values.username,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <DialogHeader>
          <DialogTitle>Edit username</DialogTitle>
          <DialogDescription className='text-gray-600'>
            Get your username just right.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <FormField
            control={form.control}
            name='username'
            render={({ field }) => (
              <FormItem className='grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1'>
                <FormLabel className='w-min text-right'>Username</FormLabel>
                <FormControl>
                  <div className='flex flex-1 gap-0'>
                    <span className='flex items-center rounded-l-md border bg-[#354B87] px-1 text-white'>
                      @
                    </span>
                    <Input
                      autoComplete='off'
                      spellCheck={false}
                      placeholder={user?.username}
                      {...field}
                      className='min-w-[200px] flex-1 rounded-l-none'
                    />
                  </div>
                </FormControl>
                <FormMessage className='col-start-2 text-center' />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter className='gap-1'>
          <DialogClose asChild>
            <Button type='reset' variant='outline'>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type='submit'
            disabled={
              (!form.formState.isValid && form.formState.isSubmitted) ||
              !user?.id
            }
          >
            Save changes
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export const EditUsernameDialog = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant='link'
          className='h-auto w-auto p-0 text-base text-gray-600'
        >
          edit
        </Button>
      </DialogTrigger>
      <DialogContent className='border-0 sm:max-w-[425px]'>
        <EditUsernameDialogContent setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  );
};
