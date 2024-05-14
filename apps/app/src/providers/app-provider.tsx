'use client';

import React, { Suspense } from 'react';
import { Hermit } from '@drizzle/db';
import { trpc } from '@/trpc/client';

type AppContextType = {
  hermits: Hermit[];
};

const AppContext = React.createContext<AppContextType>({} as AppContextType);

export const useApp = () => {
  return React.useContext(AppContext);
};

type Props = {
  children: React.ReactNode;
};
export const AppProvider = ({ children }: Props) => {
  const { data: hermits } = trpc.getHermitsLocal.useQuery();
  const sortedHermits = hermits?.sort((a, b) =>
    a.ChannelName.localeCompare(b.ChannelName),
  );

  return (
    <Suspense
      fallback={
        <div className='flex h-full w-full items-center justify-center'>
          Loading...
        </div>
      }
    >
      <AppContext.Provider
        value={{
          hermits: sortedHermits || [],
        }}
      >
        {children}
      </AppContext.Provider>
    </Suspense>
  );
};
