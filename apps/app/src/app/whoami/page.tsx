'use client';

import { useUser } from '@clerk/nextjs';

export default function WhoAmIPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className='container mx-auto p-6'>Loading...</div>;
  }

  if (!user) {
    return <div className='container mx-auto p-6'>Not signed in</div>;
  }

  return (
    <div className='container mx-auto max-w-2xl p-6'>
      <h1 className='mb-6 text-3xl font-bold'>Your User Info</h1>
      
      <div className='space-y-4 rounded-lg border bg-card p-6 shadow-sm'>
        <div>
          <h3 className='text-sm font-medium text-muted-foreground'>User ID (Clerk)</h3>
          <p className='mt-1 font-mono text-sm'>{user.id}</p>
        </div>
        
        <div>
          <h3 className='text-sm font-medium text-muted-foreground'>Email</h3>
          <p className='mt-1 text-sm'>{user.primaryEmailAddress?.emailAddress}</p>
        </div>
        
        <div>
          <h3 className='text-sm font-medium text-muted-foreground'>Username</h3>
          <p className='mt-1 text-sm'>{user.username || 'Not set'}</p>
        </div>
      </div>
      
      <div className='mt-4 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4'>
        <p className='text-sm text-blue-900'>
          Copy your User ID above and add it to <code className='rounded bg-blue-100 px-1'>.env.local</code> as:
        </p>
        <pre className='mt-2 rounded bg-blue-900 p-2 text-xs text-white'>
          ADMIN_USER_ID={user.id}
        </pre>
      </div>
    </div>
  );
}
