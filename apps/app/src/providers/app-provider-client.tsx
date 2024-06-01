'use client';

import React, { createContext, useContext } from 'react';
import { Hermit } from '@drizzle/db';

type AppContextType = {
  hermits: Hermit[];
};

const AppContext = createContext<AppContextType>({} as AppContextType);

export const useApp = () => {
  return useContext(AppContext);
};

type Props = {
  children: React.ReactNode;
  hermits: Hermit[];
};

export const AppProviderClient = ({ children, hermits }: Props) => {
  return (
    <AppContext.Provider
      value={{
        hermits,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
