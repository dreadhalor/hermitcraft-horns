'use client';
import { useState } from 'react';
import { uploadFiles } from '@/lib/uploadthing';
import { trpc } from '@/trpc/client';
import { SaveClipSchema } from '@/schemas';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export type PublishDraftParams = {
  file: File;
  start: number;
  end: number;
  videoUrl: string;
  userId: string;
  hermitId?: string;
  tagline?: string;
  season?: string;
};

export const usePublishDraft = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const saveClipMutation = trpc.saveClip.useMutation();
  const router = useRouter();

  const publishDraft = async ({
    file,
    start,
    end,
    videoUrl,
    userId,
    hermitId,
    tagline,
    season,
  }: PublishDraftParams) => {
    try {
      setIsLoading(true);
      setError(null);
      setClipUrl(null);

      // Step 1: Upload the audio file
      console.log('Uploading audio file...');
      const res = await uploadFiles('audioUploader', { files: [file] });
      const uploadedAudioUrl = res[0]!.url;
      console.log('Audio uploaded:', uploadedAudioUrl);

      // Step 2: Save the metadata to the database
      const formValues = {
        start: `${start}`,
        end: `${end}`,
        video: videoUrl,
        clipUrl: uploadedAudioUrl,
        user: userId,
        hermit: hermitId,
        tagline: tagline ?? '',
        season: season ?? '',
      } satisfies SaveClipSchema;
      console.log('Saving clip metadata...');
      await saveClipMutation.mutateAsync(formValues);
      toast.success(
        'Clip created successfully! Check it out in the home feed.',
      );
      router.push('/home');
      setClipUrl(uploadedAudioUrl);
    } catch (error) {
      console.error('Error publishing draft:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return { publishDraft, isLoading, error, clipUrl };
};
