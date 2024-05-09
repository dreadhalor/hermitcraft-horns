import { useState } from 'react';
import { trpc } from '@/trpc/client';
import { getQueryKey } from '@trpc/react-query';
import { useQueryClient } from '@tanstack/react-query';

type DeleteClipParams = {
  id: number;
};

export const useDeleteClip = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const queryClient = useQueryClient();
  const queryKey = getQueryKey(trpc.getPaginatedClips);

  const deleteClipMutation = trpc.deleteClip.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteClip = async ({ id }: DeleteClipParams) => {
    try {
      setIsLoading(true);
      setError(null);

      const formValues = {
        clipId: id,
      };

      await deleteClipMutation.mutateAsync(formValues);
    } catch (error) {
      console.error('Error creating and saving clip:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteClip, isLoading, error };
};
