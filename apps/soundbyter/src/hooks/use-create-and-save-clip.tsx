import { useState } from 'react';
import { trpc } from '@/trpc/client';
import { useGenerateClip } from './use-generate-clip';

type CreateAndSaveClipParams = {
  videoUrl: string;
  start: number;
  end: number;
};

export const useCreateAndSaveClip = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [clipUrl, setClipUrl] = useState<string | null>(null);

  const { generateClip } = useGenerateClip();
  const saveClipMutation = trpc.saveClip.useMutation();

  const createAndSaveClip = async ({
    videoUrl,
    start,
    end,
  }: CreateAndSaveClipParams) => {
    try {
      setIsLoading(true);
      setError(null);
      setClipUrl(null);

      // Step 1: Generate the clip using the useGenerateClip hook
      const uploadedClipUrl = await generateClip({ videoUrl, start, end });

      // Step 2: Save the metadata to the database
      await saveClipMutation.mutateAsync({
        start: `${start}`,
        end: `${end}`,
        video: videoUrl,
        clipUrl: uploadedClipUrl,
      });

      setClipUrl(uploadedClipUrl);
    } catch (error) {
      console.error('Error creating and saving clip:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return { createAndSaveClip, isLoading, error, clipUrl };
};
