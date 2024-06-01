import React from 'react';
import { trpcServer } from '@/trpc/server';
import { AppProviderClient } from './app-provider-client';

export const AppProviderServer = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const hermits = await trpcServer.getHermitsLocal();
  const sortedHermits = hermits.sort((a, b) =>
    a.ChannelName.localeCompare(b.ChannelName),
  );

  return (
    <AppProviderClient hermits={sortedHermits}>{children}</AppProviderClient>
  );
};
