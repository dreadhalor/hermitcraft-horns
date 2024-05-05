// 'use client';

// import { HHUser } from '@/trpc';
// import { trpc } from '@/trpc/client';
// import { useUser } from '@clerk/nextjs';
// import React, { createContext, useContext } from 'react';

// type UserContextValue = {
//   user: HHUser | null;
//   impersonatedUser: HHUser | null;
//   impersonateUser: (userId: string) => void;
// };

// const UserContext = createContext<UserContextValue>({} as UserContextValue);

// export const useUser = () => {
//   const context = useContext(UserContext);
//   if (!context) {
//     throw new Error('useHHUser must be used within a UserProvider');
//   }
//   return context;
// };

// export const ImpersonationProvider = ({
//   children,
// }: {
//   children: React.ReactNode;
// }) => {
//   const { user: clerkUser } = useUser();
//   const { data: userResult } = trpc.getUser.useQuery({
//     userId: clerkUser?.id ?? '',
//   });
//   const user = userResult ?? null;
//   const [impersonatedUser, setImpersonatedUser] = React.useState<HHUser | null>(
//     null,
//   );

//   const impersonateUser = (userId: string) => {
//     const { data } = trpc.getUser.useQuery({ userId });
//     setImpersonatedUser(data ?? null);
//   };

//   return (
//     <UserContext.Provider value={{ user, impersonatedUser, impersonateUser }}>
//       {children}
//     </UserContext.Provider>
//   );
// };
