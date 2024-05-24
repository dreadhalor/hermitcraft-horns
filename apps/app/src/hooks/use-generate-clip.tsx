import { useState, useEffect } from 'react';
import { useTask } from './use-task';

type GenerateClipParams = {
  videoUrl: string;
  start: number;
  end: number;
};

export const useGenerateClip = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const { enqueueTask, taskData } = useTask();

  const generateClip = async ({ videoUrl, start, end }: GenerateClipParams) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Enqueuing task with params:', { videoUrl, start, end });
      await enqueueTask({ videoUrl, start, end });
    } catch (error) {
      console.error('Error enqueuing task:', error);
      setError(error);
      setIsLoading(false);
      throw error;
    }
  };

  useEffect(() => {
    const processAudioFile = async () => {
      if (taskData && taskData.status === 'completed' && taskData.audioBuffer) {
        const file = new File(
          [new Uint8Array(taskData.audioBuffer.data)],
          'titles-are-lame.mp3',
          { type: 'audio/mpeg' },
        );
        setFile(file);
      }
      setIsLoading(false);
    };

    processAudioFile();
  }, [taskData]);

  return { generateClip, isLoading, error, file };
};
