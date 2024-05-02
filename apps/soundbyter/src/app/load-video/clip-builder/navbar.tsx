import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/providers/app-provider';
import { useState } from 'react';
import { FaSearch } from 'react-icons/fa';

export const Navbar = () => {
  const [inputValue, setInputValue] = useState('');

  const { videoUrl, setVideoUrl } = useApp();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setVideoUrl(inputValue);
    e.preventDefault();
    // TODO: Validate the video URL if needed
  };

  return (
    <div className='flex flex-nowrap p-2'>
      {/* <h1>Load YouTube Video</h1> */}
      <form onSubmit={handleSubmit} className='ml-auto flex'>
        <Input
          type='text'
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={videoUrl || 'Enter YouTube video URL'}
          className='text-black'
        />
        <Button type='submit'>
          <FaSearch />
        </Button>
      </form>
    </div>
  );
};
