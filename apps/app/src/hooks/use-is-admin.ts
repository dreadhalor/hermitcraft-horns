'use client';

import { useUser } from '@clerk/nextjs';

// Admin IDs come from NEXT_PUBLIC_ADMIN_USER_ID (comma-separated), the same
// list /admin uses to decide whether to render at all. This is a UI gate only:
// every admin tRPC procedure re-checks the server-side ADMIN_USER_ID list.
const ADMIN_USER_IDS =
  process.env.NEXT_PUBLIC_ADMIN_USER_ID?.split(',').map((id) => id.trim()) ??
  [];

export const useIsAdmin = () => {
  const { user, isLoaded } = useUser();
  const isAdmin = !!user?.id && ADMIN_USER_IDS.includes(user.id);
  return { isAdmin, isLoaded };
};
