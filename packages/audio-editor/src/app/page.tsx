import { AudioEditor } from './test-2/audio-editor';

export default function Home() {
  // const handleFileUploadInput = async (
  //   e: React.ChangeEvent<HTMLInputElement>
  // ) => {
  //   const file = e.target.files?.[0];
  //   if (!file) return;
  //   handleFileUpload(file);
  // };

  return (
    <main className='flex min-h-screen flex-col items-center justify-between'>
      {/* <input
        type='file'
        accept='audio/*'
        onChange={handleFileUploadInput}
        className='p-2 border rounded'
      /> */}
      <AudioEditor />
    </main>
  );
}
