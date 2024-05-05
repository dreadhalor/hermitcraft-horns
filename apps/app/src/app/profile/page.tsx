'use client';

import { HornsList } from '@/components/horns-list';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant='ghost'>
                <FaUserFriends className='text-3xl' />
              </Button>
            </DrawerTrigger>
            <DrawerContent className='px-4 pb-4'>
              <DrawerHeader>Impersonate User</DrawerHeader>
              <Select onValueChange={(userId) => impersonateUser(userId)}>
                <SelectTrigger>
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
            </DrawerContent>
          </Drawer>
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
