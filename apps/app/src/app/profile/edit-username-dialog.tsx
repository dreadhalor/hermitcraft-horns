import React from 'react';
import {
  Dialog,
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

export const EditUsernameDialog = () => {
  const { user } = useHHUser();
  const form = useForm();

  const onSubmit = (values: any) => {
    console.log(values);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant='link'
          className='h-auto w-auto p-0 text-base text-gray-600'
        >
          edit
        </Button>
      </DialogTrigger>
      <DialogContent className='border-0 sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Edit username</DialogTitle>
          <DialogDescription>Get your username just right.</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name='tagline'
                render={({ field }) => (
                  <FormItem className='flex items-center gap-4'>
                    <FormLabel className='text-right'>Name</FormLabel>
                    <FormControl>
                      <div className='flex flex-1 gap-0'>
                        <span className='flex items-center rounded-l-md border bg-[#354B87] px-1 text-white'>
                          @
                        </span>
                        <Input
                          placeholder={user?.username}
                          {...field}
                          className='flex-1 rounded-l-none'
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter className='gap-1'>
          <Button type='reset' variant='outline'>
            Cancel
          </Button>
          <Button type='submit'>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
