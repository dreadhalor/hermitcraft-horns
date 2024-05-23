'use client';
import React from 'react';
import { AudioEditor } from './audio-editor';

const Page = () => {
  const [file, setFile] = React.useState<File | undefined>();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
  };

  return (
    <div className='w-full px-4 h-full flex flex-col items-center justify-center bg-transparent border'>
      <input type='file' accept='audio/*' onChange={handleFileUpload} />
      <AudioEditor file={file} />
    </div>
  );
};

export default Page;
