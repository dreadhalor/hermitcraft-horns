import { useState } from 'react';
import { trpc } from '@/trpc/client';
import { getQueryKey } from '@trpc/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';

type DeleteClipParams = {
  id: string;
};

export const useDeleteClip = () => {
  const router = useRouter();
  const pathname = usePathname();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const queryClient = useQueryClient();
  const queryKey = getQueryKey(trpc.getPaginatedClips);

  const deleteClipMutation = trpc.deleteClip.useMutation({
    onSuccess: () => {
      toast.success('Horn deleted!');
      if (pathname.startsWith('/horn')) {
        router.push('/home');
      }
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
