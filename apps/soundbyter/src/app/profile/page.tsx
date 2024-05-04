'use client';

import { HornsList } from '@/components/horns-list';
import { Button } from '@/components/ui/button';
import { SignedIn, SignedOut, useClerk, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import React from 'react';

const ProfilePage = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  return (
    <div className='flex flex-1 flex-col p-[20px]'>
      <SignedIn>
        <h1 className='text-3xl font-bold'>Profile</h1>
        <div className='flex items-baseline gap-[10px]'>
          <span className='text-2xl'>@dreadhalor</span>
          <span className='text-base text-gray-600'>edit</span>
        </div>
        <h2 className='text-xl font-bold'>Horns</h2>
        <HornsList id={user?.id} />
      </SignedIn>
      <SignedOut>
        <Button
          onClick={() => router.push('/sign-in')}
          className='mt-[20px] w-full bg-[hsl(0,50%,50%)]'
        >
          Sign in
        </Button>
      </SignedOut>
      <SignedIn>
        <Button
          onClick={() => signOut(() => router.push('/'))}
          variant='destructive'
          className='mt-[20px] w-full bg-[hsl(0,50%,50%)]'
        >
          Sign out
        </Button>
      </SignedIn>
    </div>
  );
};

export default ProfilePage;
