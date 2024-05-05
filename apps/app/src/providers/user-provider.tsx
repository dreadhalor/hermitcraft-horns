'use client';
import { HHUser } from '@/trpc';
import { trpc } from '@/trpc/client';
import { useUser } from '@clerk/nextjs';
import React, { createContext, useContext, useEffect } from 'react';

type UserContextValue = {
  user: HHUser | null;
  superUser: HHUser | null;
  impersonateUser: (userId: string) => void;
};

const UserContext = createContext<UserContextValue>({} as UserContextValue);

export const useHHUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useHHUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: clerkUser } = useUser();
  const { data: userResult } = trpc.getUser.useQuery({
    userId: clerkUser?.id ?? '',
  });
  const [impersonatedUserId, setImpersonatedUserId] = React.useState<
    string | null
  >(null);
  const { data: impersonatedUserResult } = trpc.getUser.useQuery(
    { userId: impersonatedUserId ?? '' },
    { enabled: !!impersonatedUserId },
  );

  const impersonateUser = (userId: string) => {
    setImpersonatedUserId(userId);
  };

  const user = impersonatedUserResult || userResult || null;
  const superUser = userResult || null;

  return (
    <UserContext.Provider value={{ user, superUser, impersonateUser }}>
      {children}
    </UserContext.Provider>
  );
};
