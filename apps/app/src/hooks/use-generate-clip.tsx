import { useState, useEffect } from 'react';
import { useTask } from './use-task';
import { kebabIt } from '../lib/utils';
import { toast } from 'sonner';

type GenerateClipParams = {
  videoUrl: string;
  start: number;
  end: number;
  tagline?: string;
};

export const useGenerateClip = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [tagline, setTagline] = useState<string>('');
  const { enqueueTask, taskData, error: taskError } = useTask();

  const generateClip = async ({
    videoUrl,
    start,
    end,
    tagline,
  }: GenerateClipParams) => {
    if (tagline) setTagline(tagline);
    try {
      setIsLoading(true);
      setError(null);
      setFile(null);
      console.log('Enqueuing task with params:', { videoUrl, start, end });
      await enqueueTask({ videoUrl, start, end });
    } catch (error) {
      console.error('Error enqueuing task:', error);
      setError(error);
      setIsLoading(false);
      // Don't show toast here - the useEffect watching taskError will handle it
      throw error;
    }
  };

  useEffect(() => {
    const processAudioFile = async () => {
      if (taskData && taskData.status === 'completed' && taskData.audioBuffer) {
        const file = new File(
          [new Uint8Array(taskData.audioBuffer.data)],
          tagline ? `${kebabIt(tagline)}.mp3` : 'titles-are-lame.mp3',
          { type: 'audio/mpeg' },
        );
        setFile(file);
        setIsLoading(false);
        toast.success('Clip generated successfully!');
      }
    };

    processAudioFile();
  }, [taskData]);

  // Handle task errors (timeout, failed status, network errors)
  useEffect(() => {
    if (taskError) {
      console.error('Task error:', taskError);
      setError(taskError);
      setIsLoading(false);
      setFile(null);
      
      toast.error('Clip generation failed', {
        description: `${taskError}\n\nThe admin has been notified and will fix this issue soon.`,
        duration: 8000,
      });
    }
  }, [taskError]);

  return { generateClip, isLoading, error, file };
};
