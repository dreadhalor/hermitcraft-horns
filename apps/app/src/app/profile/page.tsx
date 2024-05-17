'use client';

import React from 'react';
import { HornsList } from '@/components/horn-tile/horns-list';
import { Button } from '@ui/button';
import { useHHUser } from '@/providers/user-provider';
import { SignedIn, SignedOut, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { EditUsernameDialog } from './edit-username-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@ui/tabs';
import { ImpersonateUserMenu } from './impersonate-user-menu';
import GoatHornImage from '@/assets/goat-horn.webp';
import Image from 'next/image';

const ProfilePage = () => {
  const { user } = useHHUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const usernameDisplay = user ? `@${user?.username}` : `Loading...`;

  const isAdmin =
    user?.username == 'dreadhalor' || user?.username == 'dreadhalor-dev';

  return (
    <div className='flex flex-1 flex-col p-[20px]'>
      <div className='flex items-center justify-between'>
        <div className='flex gap-2'>
          <button
            className='relative -mt-[2px] aspect-square h-[36px]'
            onClick={() => router.push('/')}
          >
            <Image src={GoatHornImage} alt='goat horn image' fill />
          </button>
          <h1 className='text-3xl font-bold'>Profile</h1>
        </div>
        {isAdmin && <ImpersonateUserMenu />}
      </div>
      <SignedIn>
        <div className='mb-4 flex items-baseline gap-[10px]'>
          <span className='text-2xl'>{usernameDisplay}</span>
          {user && <EditUsernameDialog />}
        </div>
        <Tabs defaultValue='your-horns'>
          <TabsList className='mb-2 grid grid-cols-2'>
            <TabsTrigger value='your-horns'>Your Horns</TabsTrigger>
            <TabsTrigger value='your-favorites'>Your Favorites</TabsTrigger>
          </TabsList>
          <TabsContent value='your-horns'>
            <HornsList
              id={user?.id}
              emptyMessage={
                <span>
                  No horns found... yet! Try&nbsp;
                  <a href='/create' className='font-bold hover:underline'>
                    making some of your own!
                  </a>
                </span>
              }
            />
          </TabsContent>
          <TabsContent value='your-favorites'>
            <HornsList
              favorites
              emptyMessage={
                <span>
                  No favorites found... yet! Try&nbsp;
                  <a href='/' className='font-bold hover:underline'>
                    picking some favorites from the home feed!
                  </a>
                </span>
              }
            />
          </TabsContent>
        </Tabs>
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
