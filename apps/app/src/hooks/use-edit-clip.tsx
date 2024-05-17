import { useState } from 'react';
import { trpc } from '@/trpc/client';
import { EditClipSchema } from '@/schemas';
import { getQueryKey } from '@trpc/react-query';
import { useQueryClient } from '@tanstack/react-query';

type EditClipParams = {
  id: string;
  hermit?: string;
  tagline?: string;
  season?: string;
};

export const useEditClip = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const queryClient = useQueryClient();
  const paginatedClipsQueryKey = getQueryKey(trpc.getPaginatedClips);
  const getClipQueryKey = getQueryKey(trpc.getClip);

  const editClipMutation = trpc.editClip.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paginatedClipsQueryKey });
      queryClient.invalidateQueries({ queryKey: getClipQueryKey });
    },
  });

  const editClip = async ({ id, hermit, tagline, season }: EditClipParams) => {
    try {
      setIsLoading(true);
      setError(null);

      const formValues = {
        id,
        hermit,
        tagline,
        season,
      } satisfies EditClipSchema;

      // Step 2: Save the metadata to the database
      await editClipMutation.mutateAsync(formValues);
    } catch (error) {
      console.error('Error creating and saving clip:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return { editClip, isLoading, error };
};
