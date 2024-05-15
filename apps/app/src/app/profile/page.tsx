'use client';

import { HornsList } from '@/components/horn-tile/horns-list';
import { Button } from '@ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select';
import { useHHUser } from '@/providers/user-provider';
import { trpc } from '@/trpc/client';
import { SignedIn, SignedOut, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import React from 'react';
import { FaUserFriends } from 'react-icons/fa';

const ProfilePage = () => {
  const { user, impersonateUser } = useHHUser();
  const { data: users } = trpc.getAllUsers.useQuery();
  const { signOut } = useClerk();
  const router = useRouter();

  const usernameDisplay = user ? `@${user?.username}` : `Loading...`;

  return (
    <div className='flex flex-1 flex-col p-[20px]'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>Profile</h1>
        {user?.username == 'dreadhalor' && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant='ghost'>
                <FaUserFriends className='text-3xl' />
              </Button>
            </SheetTrigger>
            <SheetContent
              className='flex flex-col gap-1 rounded-t-2xl px-4 pb-4'
              side='bottom'
            >
              <SheetHeader className='mb-2'>Impersonate User</SheetHeader>
              <Select onValueChange={(userId) => impersonateUser(userId)}>
                <SelectTrigger className='mb-2'>
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
              <SheetClose asChild>
                <Button>Close</Button>
              </SheetClose>
            </SheetContent>
          </Sheet>
        )}
      </div>
      <SignedIn>
        <div className='flex items-baseline gap-[10px]'>
          <span className='text-2xl'>{usernameDisplay}</span>
          {user && <span className='text-base text-gray-600'>edit</span>}
        </div>
        <h2 className='text-xl font-bold'>Your Horns</h2>
        <HornsList id={user?.id} />
      </SignedIn>
      <SignedOut>
        <p>Sign in to view your profile & create horns!</p>
        <Button
          onClick={() => router.push('/sign-in')}
          className='mt-[20px] w-full bg-[hsl(0,50%,50%)] hover:bg-[hsl(0,50%,40%)]'
        >
          Sign in
        </Button>
      </SignedOut>
      <SignedIn>
        <Button
          onClick={() => signOut(() => router.push('/'))}
          variant='destructive'
          className='mt-[20px] w-full bg-[hsl(0,50%,50%)] hover:bg-[hsl(0,50%,40%)]'
        >
          Sign out
        </Button>
      </SignedIn>
    </div>
  );
};

export default ProfilePage;
