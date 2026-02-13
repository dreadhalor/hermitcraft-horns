import { trpc } from '@/trpc/client';
import { EnqueueTaskInput } from '@repo/ytdl';
import { useEffect, useState, useRef } from 'react';
import * as Sentry from '@sentry/nextjs';

const TIMEOUT_MS = 180000; // 3 minutes

export const useTask = () => {
  const enqueueTaskMutation = trpc.enqueueTask.useMutation();
  const updateLogMutation = trpc.updateGenerationLogStatus.useMutation();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskData, setTaskData] = useState<any>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const { isLoading, error } = trpc.checkTaskStatus.useQuery(
    { taskId: taskId ?? '' },
    {
      enabled: !!taskId,
      refetchInterval: (data) => {
        // Stop polling if completed or failed
        if (data?.status === 'completed' || data?.status === 'failed') {
          return false;
        }
        
        // Check for timeout
        if (startTimeRef.current && Date.now() - startTimeRef.current > TIMEOUT_MS) {
          return false;
        }
        
        return taskId ? 1000 : false; // Poll every second if taskId exists
      },
      onSuccess: (data) => {
        if (data?.status === 'completed') {
          setTaskId(null);
          setTaskData(data);
          setTaskError(null);
          startTimeRef.current = null;
          
          // Update generation log
          if (taskId) {
            updateLogMutation.mutate({
              taskId,
              status: 'completed',
            });
          }
        } else if (data?.status === 'failed') {
          setTaskId(null);
          setTaskData(null);
          setTaskError('Failed to download audio from YouTube. Please try a different video or try again later.');
          startTimeRef.current = null;
          
          // Update generation log
          if (taskId) {
            updateLogMutation.mutate({
              taskId,
              status: 'failed',
              errorMessage: 'YouTube download failed',
            });
          }
          
          // Report to Sentry
          Sentry.captureException(new Error('YTDL task failed'), {
            tags: {
              'error.type': 'ytdl_failure',
              'task.status': 'failed',
            },
            contexts: {
              task: {
                taskId: taskId,
                duration_ms: startTimeRef.current ? Date.now() - startTimeRef.current : null,
              },
            },
          });
        }
      },
      onError: (err) => {
        console.error('Error checking task status:', err);
        const currentTaskId = taskId;
        setTaskId(null);
        setTaskData(null);
        setTaskError('Unable to connect to the YouTube audio download service. Please try again later.');
        startTimeRef.current = null;
        
        // Update generation log
        if (currentTaskId) {
          updateLogMutation.mutate({
            taskId: currentTaskId,
            status: 'failed',
            errorMessage: 'Network error checking task status',
          });
        }
        
        // Report to Sentry
        Sentry.captureException(err, {
          tags: {
            'error.type': 'ytdl_failure',
            'task.status': 'network_error',
          },
          contexts: {
            task: {
              taskId: currentTaskId,
              duration_ms: startTimeRef.current ? Date.now() - startTimeRef.current : null,
            },
          },
        });
      },
      retry: 2, // Retry failed requests twice before giving up
    },
  );

  // Check for timeout
  useEffect(() => {
    if (!taskId || !startTimeRef.current) return;

    const timeoutId = setTimeout(() => {
      if (taskId) {
        console.error('Task timeout after 3 minutes');
        const currentTaskId = taskId;
        setTaskId(null);
        setTaskData(null);
        setTaskError('Audio download timed out after 3 minutes. The YouTube download service may be overloaded or unavailable.');
        
        // Update generation log
        updateLogMutation.mutate({
          taskId: currentTaskId,
          status: 'failed',
          errorMessage: 'Timeout after 3 minutes',
        });
        
        // Report timeout to Sentry
        Sentry.captureException(new Error('YTDL task timeout'), {
          tags: {
            'error.type': 'ytdl_failure',
            'task.status': 'timeout',
          },
          contexts: {
            task: {
              taskId: currentTaskId,
              timeout_ms: TIMEOUT_MS,
            },
          },
        });
        
        startTimeRef.current = null;
      }
    }, TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [taskId]);

  const enqueueTask = async ({ userId, videoUrl, start, end }: EnqueueTaskInput & { userId: string }) => {
    try {
      setTaskError(null);
      setTaskData(null);
      const { taskId } = await enqueueTaskMutation.mutateAsync({
        userId,
        videoUrl,
        start,
        end,
      });
      setTaskId(taskId);
      startTimeRef.current = Date.now();
      return taskId;
    } catch (error) {
      console.error('Error enqueuing task:', error);
      setTaskError('Failed to start audio download. The YouTube download service may be unavailable.');
      
      // Report to Sentry
      Sentry.captureException(error, {
        tags: {
          'error.type': 'ytdl_failure',
          'task.status': 'enqueue_failed',
        },
        extra: {
          userId,
          videoUrl,
          start,
          end,
        },
      });
      
      throw error;
    }
  };

  useEffect(() => {
    if (taskId) {
      console.log('Task enqueued with taskId:', taskId);
    }
  }, [taskId]);

  return { enqueueTask, taskData, isLoading, error: taskError };
};
