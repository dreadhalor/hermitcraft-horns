import { useState } from 'react';
import { trpc } from '@/trpc/client';
import { uploadFiles } from '@/lib/uploadthing';

type ExtractAudioParams = {
  videoUrl: string;
  start: number;
  end: number;
};

export const useGenerateClip = () => {
  const [uploadResponse, setUploadResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const extractAudioMutation = trpc.extractAudio.useMutation();

  const generateClip = async ({ videoUrl, start, end }: ExtractAudioParams) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await extractAudioMutation.mutateAsync({
        videoUrl,
        start,
        end,
      });
      console.log('Audio extraction result:', result);
      const { data } = result;

      // Create a File object from the buffer data
      const file = new File([new Uint8Array(data)], 'audio.mp3', {
        type: 'audio/mpeg',
      });
      console.log('File:', file);

      // Upload the file to UploadThing
      const res = await uploadFiles('audioUploader', { files: [file] });
      console.log('Upload response:', res);
      setUploadResponse(res);

      return res[0].url;
    } catch (error) {
      console.error('Error generating clip:', error);
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { generateClip, uploadResponse, isLoading, error };
};
