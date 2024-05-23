'use client';

import { AudioEditor } from './test-2/audio-editor';
import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | undefined>();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
  };

  return (
    <main className='flex min-h-screen flex-col items-center justify-between'>
      <input
        type='file'
        accept='audio/*'
        onChange={handleFileUpload}
        className='p-2 border rounded'
      />
      <AudioEditor file={file} />
    </main>
  );
}
