import React from 'react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@ui/sheet';
import { Button } from '@ui/button';
import { FaUserFriends } from 'react-icons/fa';
import { Separator } from '@ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select';
import { useHHUser } from '@/providers/user-provider';
import { trpc } from '@/trpc/client';

export const ImpersonateUserMenu = () => {
  const { user, impersonateUser } = useHHUser();
  const { data: users } = trpc.getAllUsers.useQuery();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='ghost'>
          <FaUserFriends className='text-3xl' />
        </Button>
      </SheetTrigger>
      <SheetContent
        className='flex flex-col gap-1 rounded-t-lg border-0 p-0 pb-4 pt-3'
        side='bottom'
      >
        <SheetHeader className='mb-2 px-4 text-start text-sm uppercase text-gray-600'>
          Impersonate User
        </SheetHeader>
        <Separator className='mx-4 w-auto bg-gray-600' />
        <Select onValueChange={(userId) => impersonateUser(userId)}>
          <SelectTrigger className='m-2 w-auto'>
            <SelectValue placeholder='Select user' />
          </SelectTrigger>
          <SelectContent>
            {users &&
              users
                .filter((_user) => _user.id !== user?.id)
                .map((_user) => (
                  <SelectItem key={_user.id} value={_user.id}>
                    {_user.username}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
        <div className='flex p-2 pt-1'>
          <SheetClose asChild>
            <Button
              variant='outline'
              className='h-[36px] flex-1 gap-2 rounded-full border-gray-600 text-sm hover:bg-[#4665BA] hover:text-white'
            >
              Close
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
};
