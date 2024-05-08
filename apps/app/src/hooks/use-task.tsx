import { trpc } from '@/trpc/client';
import { EnqueueTaskInput } from '@repo/ytdl';
import { useEffect, useState } from 'react';

export const useTask = () => {
  const enqueueTaskMutation = trpc.enqueueTask.useMutation();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskData, setTaskData] = useState<any>(null);

  const { data, isLoading, error } = trpc.checkTaskStatus.useQuery(
    { taskId: taskId ?? '' },
    {
      enabled: !!taskId,
      refetchInterval: (data) => {
        if (data?.status === 'completed') {
          return false; // Stop polling when data is received
        }
        return taskId ? 1000 : false; // Poll every second if taskId exists
      },
      onSuccess: (data) => {
        if (data?.status === 'completed') {
          setTaskId(null);
          setTaskData(data);
        }
      },
    },
  );

  const enqueueTask = async ({ videoUrl, start, end }: EnqueueTaskInput) => {
    try {
      const { taskId } = await enqueueTaskMutation.mutateAsync({
        videoUrl,
        start,
        end,
      });
      setTaskId(taskId);
      return taskId;
    } catch (error) {
      console.error('Error enqueuing task:', error);
    }
  };

  useEffect(() => {
    if (taskId) {
      console.log('Task enqueued with taskId:', taskId);
    }
  }, [taskId]);

  return { enqueueTask, taskData, isLoading, error };
};
