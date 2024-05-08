'use client';
import { useState, useEffect } from 'react';
import { trpc } from '@/trpc/client';
import { useGenerateClip } from './use-generate-clip';
import { SaveClipSchema } from '@/schemas';

type CreateAndSaveClipParams = {
  videoUrl: string;
  start: number;
  end: number;
  userId: string;
  hermitId?: string;
  tagline?: string;
  season?: string;
};

export const useCreateAndSaveClip = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const {
    generateClip,
    uploadedAudioUrl,
    isLoading: isGeneratingClip,
    error: generateClipError,
  } = useGenerateClip();
  const saveClipMutation = trpc.saveClip.useMutation();

  const [videoUrl, setVideoUrl] = useState<string>('');
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [hermitId, setHermitId] = useState<string | undefined>(undefined);
  const [tagline, setTagline] = useState<string | undefined>(undefined);
  const [season, setSeason] = useState<string | undefined>(undefined);

  const createAndSaveClip = async ({
    videoUrl,
    start,
    end,
    userId,
    hermitId,
    tagline,
    season,
  }: CreateAndSaveClipParams) => {
    if (!userId) throw new Error('User must be provided to create clip');
    if (!videoUrl) throw new Error('Video URL must be provided to create clip');
    if (!start) throw new Error('Start time must be provided to create clip');
    if (!end) throw new Error('End time must be provided to create clip');

    setVideoUrl(videoUrl);
    setStart(start);
    setEnd(end);
    setUserId(userId);
    setHermitId(hermitId);
    setTagline(tagline);
    setSeason(season);

    try {
      setIsLoading(true);
      setError(null);
      setClipUrl(null);

      // Step 1: Generate the clip
      await generateClip({ videoUrl, start, end });
    } catch (error) {
      console.error('Error creating and saving clip:', error);
      setError(error);
    } finally {
      // setIsLoading(false);
    }
  };

  useEffect(() => {
    const saveClipMetadata = async () => {
      if (uploadedAudioUrl) {
        try {
          // Save the metadata to the database
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
          console.log('Clip metadata saved');
          setClipUrl(uploadedAudioUrl);
        } catch (error) {
          console.error('Error saving clip metadata:', error);
          setError(error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    saveClipMetadata();
  }, [uploadedAudioUrl]);

  return { createAndSaveClip, isLoading, error, clipUrl };
};
