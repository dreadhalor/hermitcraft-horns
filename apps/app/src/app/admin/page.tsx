'use client';

import { trpc } from '@/trpc/client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@ui/button';

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  // Check if user is admin using environment variable (supports multiple IDs)
  const ADMIN_USER_IDS = process.env.NEXT_PUBLIC_ADMIN_USER_ID?.split(',').map(id => id.trim()) || [];
  const isAdmin = user?.id ? ADMIN_USER_IDS.includes(user.id) : false;

  // Debug logging
  useEffect(() => {
    console.log('🔍 Admin Page Debug:');
    console.log('  - Your User ID:', user?.id);
    console.log('  - Allowed Admin IDs:', ADMIN_USER_IDS);
    console.log('  - Is Admin?', isAdmin);
    console.log('  - Is Loaded?', isLoaded);
  }, [user?.id, isAdmin, isLoaded]);

  useEffect(() => {
    if (isLoaded && !isAdmin) {
      console.log('❌ Not admin - redirecting to home');
      router.push('/');
    }
  }, [isLoaded, isAdmin, router]);

  const getSinceDate = () => {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return undefined;
    }
  };

  const { data: stats, isLoading: statsLoading } = trpc.getGenerationStats.useQuery(
    {
      adminUserId: user?.id || '',
      since: getSinceDate(),
    },
    {
      enabled: !!user && isAdmin,
    },
  );

  const { data: logs, isLoading: logsLoading } = trpc.getGenerationLogs.useQuery(
    {
      adminUserId: user?.id || '',
      limit: 50,
      offset: 0,
    },
    {
      enabled: !!user && isAdmin,
    },
  );

  if (!isLoaded || !isAdmin) {
    return null;
  }

  const successRate = stats
    ? stats.byStatus.find((s) => s.status === 'completed')?.count || 0
    : 0;
  const failureRate = stats
    ? stats.byStatus.find((s) => s.status === 'failed')?.count || 0
    : 0;
  const total = stats?.total || 0;

  return (
    <div className='container mx-auto max-w-7xl p-6'>
      <h1 className='mb-6 text-3xl font-bold'>Admin Dashboard</h1>

      {/* Time Range Filter */}
      <div className='mb-6 flex gap-2'>
        <Button
          variant={timeRange === '24h' ? 'default' : 'outline'}
          onClick={() => setTimeRange('24h')}
        >
          Last 24h
        </Button>
        <Button
          variant={timeRange === '7d' ? 'default' : 'outline'}
          onClick={() => setTimeRange('7d')}
        >
          Last 7 days
        </Button>
        <Button
          variant={timeRange === '30d' ? 'default' : 'outline'}
          onClick={() => setTimeRange('30d')}
        >
          Last 30 days
        </Button>
        <Button
          variant={timeRange === 'all' ? 'default' : 'outline'}
          onClick={() => setTimeRange('all')}
        >
          All Time
        </Button>
      </div>

      {/* Stats Overview */}
      {statsLoading ? (
        <div>Loading stats...</div>
      ) : (
        <div className='mb-8 grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div className='rounded-lg border bg-card p-4 text-card-foreground shadow-sm'>
            <h3 className='text-sm font-medium text-muted-foreground'>Total Requests</h3>
            <p className='text-2xl font-bold'>{total}</p>
          </div>
          <div className='rounded-lg border bg-card p-4 text-card-foreground shadow-sm'>
            <h3 className='text-sm font-medium text-muted-foreground'>Successful</h3>
            <p className='text-2xl font-bold text-green-600'>{successRate}</p>
          </div>
          <div className='rounded-lg border bg-card p-4 text-card-foreground shadow-sm'>
            <h3 className='text-sm font-medium text-muted-foreground'>Failed</h3>
            <p className='text-2xl font-bold text-red-600'>{failureRate}</p>
          </div>
          <div className='rounded-lg border bg-card p-4 text-card-foreground shadow-sm'>
            <h3 className='text-sm font-medium text-muted-foreground'>Success Rate</h3>
            <p className='text-2xl font-bold'>
              {total > 0 ? ((successRate / total) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Top Users */}
      {stats && stats.topUsers.length > 0 && (
        <div className='mb-8'>
          <h2 className='mb-4 text-xl font-semibold'>Top Users</h2>
          <div className='rounded-lg border bg-card shadow-sm'>
            <table className='w-full'>
              <thead>
                <tr className='border-b'>
                  <th className='p-3 text-left'>Username</th>
                  <th className='p-3 text-right'>Requests</th>
                </tr>
              </thead>
              <tbody>
                {stats.topUsers.map((user, idx) => (
                  <tr key={user.userId} className='border-b last:border-0'>
                    <td className='p-3'>{user.username || 'Unknown'}</td>
                    <td className='p-3 text-right font-mono'>{user.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Activity Chart */}
      {stats && stats.recentActivity.length > 0 && (
        <div className='mb-8'>
          <h2 className='mb-4 text-xl font-semibold'>Recent Activity</h2>
          <div className='rounded-lg border bg-card p-4 shadow-sm'>
            <div className='space-y-2'>
              {stats.recentActivity.map((day) => (
                <div key={day.date} className='flex items-center gap-4'>
                  <span className='w-24 text-sm text-muted-foreground'>{day.date}</span>
                  <div className='flex-1'>
                    <div
                      className='h-6 rounded bg-blue-500'
                      style={{ width: `${(day.count / (stats.recentActivity[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                  <span className='w-12 text-right font-mono text-sm'>{day.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Requests Log */}
      <div>
        <h2 className='mb-4 text-xl font-semibold'>Recent Generation Requests</h2>
        {logsLoading ? (
          <div>Loading logs...</div>
        ) : logs && logs.length > 0 ? (
          <div className='rounded-lg border bg-card shadow-sm'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b'>
                    <th className='p-3 text-left'>Time</th>
                    <th className='p-3 text-left'>User</th>
                    <th className='p-3 text-left'>Video</th>
                    <th className='p-3 text-left'>Duration</th>
                    <th className='p-3 text-left'>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const duration = log.completedAt && log.createdAt
                      ? ((new Date(log.completedAt).getTime() - new Date(log.createdAt).getTime()) / 1000).toFixed(1)
                      : 'N/A';

                    return (
                      <tr key={log.id} className='border-b last:border-0 hover:bg-muted/50'>
                        <td className='p-3 text-sm'>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className='p-3 text-sm'>{log.username || 'Unknown'}</td>
                        <td className='max-w-xs truncate p-3 text-sm'>
                          <a
                            href={log.videoUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-blue-500 hover:underline'
                          >
                            {log.videoUrl.replace('https://www.youtube.com/watch?v=', 'YT: ')}
                          </a>
                        </td>
                        <td className='p-3 text-sm'>
                          {parseFloat(log.start).toFixed(1)}s - {parseFloat(log.end).toFixed(1)}s
                        </td>
                        <td className='p-3'>
                          <span
                            className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                              log.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : log.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {log.status}
                          </span>
                          {log.status === 'failed' && log.errorMessage && (
                            <span className='ml-2 text-xs text-muted-foreground'>
                              {log.errorMessage}
                            </span>
                          )}
                          {log.status === 'completed' && duration !== 'N/A' && (
                            <span className='ml-2 text-xs text-muted-foreground'>
                              ({duration}s)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className='rounded-lg border bg-card p-8 text-center text-muted-foreground'>
            No generation requests yet
          </div>
        )}
      </div>
    </div>
  );
}
