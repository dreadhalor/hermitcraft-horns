import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { FaSearch } from 'react-icons/fa';

interface Props {
  videoUrl: string;
  setVideoUrl: (url: string) => void;
}
export const Navbar = ({ videoUrl, setVideoUrl }: Props) => {
  const [inputValue, setInputValue] = useState('');

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
