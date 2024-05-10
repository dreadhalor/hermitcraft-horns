import { useState, useEffect } from 'react';
import { uploadFiles } from '@/lib/uploadthing';
import { useTask } from './use-task';

type GenerateClipParams = {
  videoUrl: string;
  start: number;
  end: number;
};

export const useGenerateClip = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
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
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const uploadAudioFile = async () => {
      if (taskData && taskData.status === 'completed' && taskData.audioBuffer) {
        const file = new File(
          [new Uint8Array(taskData.audioBuffer.data)],
          'titles-are-lame.mp3',
          { type: 'audio/mpeg' },
        );
        console.log('Uploading audio file...');
        try {
          const res = await uploadFiles('audioUploader', { files: [file] });
          console.log('Audio uploaded:', res[0].url);
          setUploadedAudioUrl(res[0].url);
        } catch (error) {
          console.error('Error uploading audio:', error);
          setError(error);
        }
      }
    };

    uploadAudioFile();
  }, [taskData]);

  return { generateClip, isLoading, error, uploadedAudioUrl };
};
