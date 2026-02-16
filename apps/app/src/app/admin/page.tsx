'use client';

import { trpc } from '@/trpc/client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>(
    '7d',
  );
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  const toggleError = (id: string) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Check if user is admin using environment variable (supports multiple IDs)
  const ADMIN_USER_IDS =
    process.env.NEXT_PUBLIC_ADMIN_USER_ID?.split(',').map((id) => id.trim()) ||
    [];
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

  const sinceDate = useMemo(() => {
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
  }, [timeRange]);

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = trpc.getGenerationStats.useQuery(
    {
      adminUserId: user?.id || '',
      since: sinceDate,
    },
    {
      enabled: !!user && isAdmin,
      retry: 2,
      retryDelay: 1000,
      staleTime: 30000, // Consider data fresh for 30 seconds
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: false, // Don't refetch on component mount if we have data
    },
  );

  // Debug stats loading
  useEffect(() => {
    console.log('📊 Stats State:', {
      statsLoading,
      hasStats: !!stats,
      hasError: !!statsError,
      errorMessage: statsError?.message,
      queryEnabled: !!user && isAdmin,
      userId: user?.id,
    });
    if (statsError) {
      console.error('❌ Stats query error:', statsError);
    }
    if (stats) {
      console.log('✅ Stats loaded:', stats);
    }
  }, [stats, statsError, statsLoading, user, isAdmin]);

  const { data: logs, isLoading: logsLoading } =
    trpc.getGenerationLogs.useQuery(
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
    <div className='w-full max-w-[1600px] mx-auto p-3 sm:p-6 overflow-x-hidden'>
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
        <h1 className='text-2xl sm:text-3xl font-bold'>Admin Dashboard</h1>
        <Button 
          onClick={() => router.push('/admin/metrics')}
          variant="outline"
          size="sm"
        >
          🌐 VPN Metrics
        </Button>
      </div>

      {/* Time Range Filter */}
      <div className='mb-4 sm:mb-6 flex flex-wrap gap-2'>
        <Button
          size="sm"
          variant={timeRange === '24h' ? 'default' : 'outline'}
          onClick={() => setTimeRange('24h')}
        >
          Last 24h
        </Button>
        <Button
          size="sm"
          variant={timeRange === '7d' ? 'default' : 'outline'}
          onClick={() => setTimeRange('7d')}
        >
          Last 7 days
        </Button>
        <Button
          size="sm"
          variant={timeRange === '30d' ? 'default' : 'outline'}
          onClick={() => setTimeRange('30d')}
        >
          Last 30 days
        </Button>
        <Button
          size="sm"
          variant={timeRange === 'all' ? 'default' : 'outline'}
          onClick={() => setTimeRange('all')}
        >
          All Time
        </Button>
      </div>

      {/* Stats Overview */}
      {statsLoading ? (
        <div className='mb-8'>Loading stats...</div>
      ) : statsError ? (
        <div className='mb-8 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800'>
          <h3 className='font-semibold'>Error loading stats</h3>
          <p className='text-sm'>{statsError.message}</p>
        </div>
      ) : stats ? (
        <div className='mb-8 grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4'>
          <div className='rounded-lg border bg-card p-4 text-card-foreground shadow-sm'>
            <h3 className='text-sm font-medium text-muted-foreground'>
              Total Requests
            </h3>
            <p className='text-2xl font-bold'>{total}</p>
          </div>
          <div className='rounded-lg border bg-card p-4 text-card-foreground shadow-sm'>
            <h3 className='text-sm font-medium text-muted-foreground'>
              Successful
            </h3>
            <p className='text-2xl font-bold text-green-600'>{successRate}</p>
          </div>
          <div className='rounded-lg border bg-card p-4 text-card-foreground shadow-sm'>
            <h3 className='text-sm font-medium text-muted-foreground'>
              Failed
            </h3>
            <p className='text-2xl font-bold text-red-600'>{failureRate}</p>
          </div>
          <div className='rounded-lg border bg-card p-4 text-card-foreground shadow-sm'>
            <h3 className='text-sm font-medium text-muted-foreground'>
              Success Rate
            </h3>
            <p className='text-2xl font-bold'>
              {total > 0 ? ((successRate / total) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      ) : (
        <div className='mb-8'>No stats available</div>
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
      {stats && stats.recentActivity.length > 0 && (() => {
        const maxCount = Math.max(...stats.recentActivity.map((d) => d.count), 1);
        return (
          <div className='mb-8'>
            <h2 className='mb-4 text-xl font-semibold'>Recent Activity</h2>
            <div className='rounded-lg border bg-card p-3 sm:p-4 shadow-sm'>
              <div className='space-y-2'>
                {stats.recentActivity.map((day) => (
                  <div key={day.date} className='flex items-center gap-2 sm:gap-4 min-w-0'>
                    <span className='w-20 sm:w-24 shrink-0 text-xs sm:text-sm text-muted-foreground'>
                      {day.date}
                    </span>
                    <div className='flex-1 min-w-0'>
                      <div
                        className='h-5 sm:h-6 rounded bg-blue-500'
                        style={{
                          width: `${(day.count / maxCount) * 100}%`,
                          minWidth: '4px',
                        }}
                      />
                    </div>
                    <span className='w-8 sm:w-12 shrink-0 text-right font-mono text-xs sm:text-sm'>
                      {day.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Recent Requests Log */}
      <div>
        <h2 className='mb-4 text-xl font-semibold'>
          Recent Generation Requests
        </h2>
        {logsLoading ? (
          <div>Loading logs...</div>
        ) : logs && logs.length > 0 ? (
          <div className='rounded-lg border bg-card shadow-sm'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b'>
                    <th className='p-2 sm:p-3 text-left text-xs sm:text-sm'>Time</th>
                    <th className='p-2 sm:p-3 text-left text-xs sm:text-sm'>User</th>
                    <th className='p-2 sm:p-3 text-left text-xs sm:text-sm hidden sm:table-cell'>Video</th>
                    <th className='p-2 sm:p-3 text-left text-xs sm:text-sm hidden md:table-cell'>Duration</th>
                    <th className='p-2 sm:p-3 text-left text-xs sm:text-sm'>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const duration =
                      log.completedAt && log.createdAt
                        ? (
                            (new Date(log.completedAt).getTime() -
                              new Date(log.createdAt).getTime()) /
                            1000
                          ).toFixed(1)
                        : 'N/A';

                    return (
                      <tr
                        key={log.id}
                        className='border-b last:border-0 hover:bg-muted/50'
                      >
                        <td className='whitespace-nowrap p-2 sm:p-3 text-xs sm:text-sm'>
                          {new Date(log.createdAt).toLocaleDateString()}
                        </td>
                        <td className='p-2 sm:p-3 text-xs sm:text-sm'>
                          {log.username || (
                            <span className='flex items-center gap-1 text-muted-foreground'>
                              <span className='rounded bg-muted px-1.5 py-0.5 text-xs font-medium'>
                                {log.source === 'cli' ? 'CLI' : 'Unknown'}
                              </span>
                            </span>
                          )}
                        </td>
                        <td className='p-2 sm:p-3 text-xs sm:text-sm hidden sm:table-cell'>
                          <a
                            href={log.videoUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='block truncate max-w-[200px] lg:max-w-[300px] text-blue-500 hover:underline'
                            title={log.videoUrl}
                          >
                            {log.videoUrl.replace(
                              'https://www.youtube.com/watch?v=',
                              'YT: ',
                            )}
                          </a>
                        </td>
                        <td className='whitespace-nowrap p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell'>
                          {parseFloat(log.start).toFixed(1)}s -{' '}
                          {parseFloat(log.end).toFixed(1)}s
                        </td>
                        <td className='p-2 sm:p-3'>
                          <div className='flex flex-col gap-1'>
                            <div className='flex items-center gap-2'>
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
                              {log.status === 'completed' &&
                                duration !== 'N/A' && (
                                  <span className='text-xs text-muted-foreground'>
                                    ({duration}s)
                                  </span>
                                )}
                              {log.status === 'failed' && log.errorMessage && (
                                <button
                                  onClick={() => toggleError(log.id)}
                                  className='flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'
                                >
                                  {expandedErrors.has(log.id) ? (
                                    <>
                                      Hide error{' '}
                                      <ChevronUp className='h-3 w-3' />
                                    </>
                                  ) : (
                                    <>
                                      Show error{' '}
                                      <ChevronDown className='h-3 w-3' />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            {log.status === 'failed' &&
                              log.errorMessage &&
                              expandedErrors.has(log.id) && (
                                <div className='mt-2 rounded bg-red-50 p-2 text-xs text-red-900'>
                                  <div className='whitespace-pre-wrap break-all font-mono'>
                                    {log.errorMessage}
                                  </div>
                                </div>
                              )}
                          </div>
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
