import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { useClipBuilder } from '@/providers/clip-builder-provider';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import GoatHornImage from '@/assets/goat-horn.webp';
import { getYouTubeId } from '@/lib/utils';

export const Navbar = () => {
  const [inputValue, setInputValue] = useState('');

  const { videoUrl } = useClipBuilder();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // get the id from the input - the input should be a YouTube video URL
    const id = getYouTubeId(inputValue);
    // if not a valid YouTube URL, bail
    if (!id) return;
    router.push(`?id=${id}`);
  };

  return (
    <div className='flex flex-nowrap items-center gap-2 p-2'>
      <button
        className='relative -mt-[2px] aspect-square h-full'
        onClick={() => router.push('/home')}
      >
        <Image src={GoatHornImage} alt='goat horn image' fill />
      </button>
      <h1 className='text-3xl font-bold'>Create</h1>
      <form onSubmit={handleSubmit} className='ml-auto flex'>
        <Input
          type='text'
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={videoUrl || 'Enter YouTube video URL'}
          className='rounded-r-none text-base text-black'
        />
        <Button type='submit' className='rounded-l-none'>
          <FaSearch />
        </Button>
      </form>
    </div>
  );
};
