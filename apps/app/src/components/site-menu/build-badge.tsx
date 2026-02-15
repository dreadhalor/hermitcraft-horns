'use client';

import { useEffect, useState } from 'react';

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function BuildBadge() {
  const gitHash = process.env.NEXT_PUBLIC_GIT_HASH || 'dev';
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const isDev = process.env.NODE_ENV === 'development';

  const [relativeTime, setRelativeTime] = useState<string>('');

  useEffect(() => {
    if (!buildTime || isDev) return;

    const updateRelativeTime = () => {
      setRelativeTime(getRelativeTime(new Date(buildTime)));
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 60000);

    return () => clearInterval(interval);
  }, [buildTime, isDev]);

  const formattedTime = buildTime
    ? new Date(buildTime).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : null;

  return (
    <p
      className='mt-auto pt-4 text-center font-mono text-[10px] text-white/40'
      suppressHydrationWarning
    >
      {isDev ? (
        <>Build: {gitHash} (dev)</>
      ) : (
        <>
          Build: {gitHash}
          {buildTime && relativeTime && (
            <span className='ml-1'>
              • {relativeTime} ({formattedTime})
            </span>
          )}
        </>
      )}
    </p>
  );
}
