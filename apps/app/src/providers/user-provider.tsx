'use client';
import { HHUser } from '@/trpc';
import { trpc } from '@/trpc/client';
import { useUser } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { getQueryKey } from '@trpc/react-query';
import React, { createContext, useContext } from 'react';

type UserContextValue = {
  user: HHUser | null;
  superUser: HHUser | null;
  impersonateUser: (userId: string) => void;
  likeClip: (userId: string, clipId: number) => void;
  unlikeClip: (userId: string, clipId: number) => void;
  incrementClipDownloads: (clipId: number) => Promise<void>;
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
  const queryClient = useQueryClient();
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

  const queryKey = getQueryKey(trpc.getClips);

  const likeClipMutation = trpc.likeClip.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
  const unlikeClipMutation = trpc.unlikeClip.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const likeClip = (userId: string, clipId: number) => {
    likeClipMutation.mutate({ userId, clipId });
  };
  const unlikeClip = (userId: string, clipId: number) => {
    unlikeClipMutation.mutate({ userId, clipId });
  };

  const incrementClipDownloadsMutation =
    trpc.incrementClipDownloads.useMutation({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    });
  const incrementClipDownloads = async (clipId: number) => {
    await incrementClipDownloadsMutation.mutateAsync({ clipId });
  };

  const impersonateUser = (userId: string) => {
    setImpersonatedUserId(userId);
  };

  const user = impersonatedUserResult || userResult || null;
  const superUser = userResult || null;

  return (
    <UserContext.Provider
      value={{
        user,
        superUser,
        impersonateUser,
        likeClip,
        unlikeClip,
        incrementClipDownloads,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
