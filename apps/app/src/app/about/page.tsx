'use client';
import { useRouter } from 'next/navigation';
import React from 'react';
import GoatHornImage from '@/assets/goat-horn.webp';
import Image from 'next/image';
import Link from 'next/link';

const AboutPage = () => {
  const router = useRouter();
  return (
    <div className='about-page flex flex-1 flex-col gap-6 px-8 py-8 sm:px-0'>
      <div className='flex items-center gap-4'>
        <button
          className='relative -mt-[2px] aspect-square h-[48px] transition-transform duration-300 ease-in-out hover:scale-110'
          onClick={() => router.push('/')}
        >
          <Image src={GoatHornImage} alt='goat horn image' fill />
        </button>
        <h1 className='text-4xl font-bold text-gray-800'>About</h1>
      </div>
      <p className='text-lg text-gray-700'>
        <b className='text-xl text-blue-700'>Oh, snappers!</b> Welcome to
        Hermitcraft Horns! It means a lot to me that you're here. 🎉
      </p>
      <p className='text-lg text-gray-700'>
        As an avid viewer of Hermitcraft, I found myself seeing the same two
        sentiments echoed over and over in the comment sections of the hermits'
        videos: "That quote would make a great horn!" & "What episode is that
        horn from?"
      </p>
      <p className='text-lg text-gray-700'>
        & since there isn't a place to easily create & share those moments, I
        made one everyone can use for free!
      </p>
      <p className='text-lg text-gray-700'>
        Here, you can easily load up any YouTube video in the{' '}
        <Link
          href='/create'
          className='text-blue-700 underline hover:text-blue-800'
        >
          Create
        </Link>{' '}
        tab & create as many downloadable horns of all of your favorite Hermit
        quotes as you want, along with viewing others' favorite quotes too!
        Download as many as you want & use them in your own servers!
      </p>
      <p className='text-lg text-gray-700'>
        On top of that, you can find the context of any horn by simply clicking{' '}
        <Link
          href='/create?id=dV7FzUOlYc8&start=1457300&end=1459600'
          className='text-blue-700 underline hover:text-blue-800'
        >
          'View clip'
        </Link>{' '}
        on a horn & the source video will be automatically loaded into the{' '}
        <Link
          href='/create?id=Ic3YU4WbyJo'
          className='text-blue-700 underline hover:text-blue-800'
        >
          Create
        </Link>{' '}
        tab with the clip already set up for you so you won't have to wonder
        what episode or how far into the episode it's from! Whether it's from an
        episode or a livestream, you can easily find the context of any horn!
      </p>
      <p className='text-lg text-gray-700'>
        & of course, this is just the initial release of the site. There will be
        many optimizations & additional features added to make the site faster &
        more functional as our horn collection gets bigger, so this is just the
        beginning.
      </p>
      <p className='text-lg text-gray-700'>
        The code is open source so if you're a coder, feel free to check out the{' '}
        <a
          href='https://github.com/dreadhalor/hermitcraft-horns'
          target='_blank'
          rel='noreferrer'
          className='text-blue-700 underline hover:text-blue-800'
        >
          Hermitcraft Horns GitHub repo
        </a>{' '}
        & give it a star! 🌟
      </p>
      <p className='text-lg text-gray-700'>
        I don't use socia media much but if you have any suggestions, feedback,
        or issues, you can reach out to my Reddit account at{' '}
        <a
          href='https://www.reddit.com/user/dreadhalor/'
          target='_blank'
          rel='noreferrer'
          className='text-blue-700 underline hover:text-blue-800'
        >
          @dreadhalor
        </a>{' '}
        or open an issue in the GitHub repo & I'll get back to you as soon as I
        can, though first{' '}
        <Link
          href='/horn/5295705f-e2a8-4939-8376-07d9b978ae7d'
          className='text-blue-700 underline hover:text-blue-800'
        >
          I may have to put you on hold...
        </Link>
      </p>
      <p>
        Oh, & if anyone's looking for a software engineer... I'm ✨recently
        unemployed & could use a job✨ 😉
      </p>
    </div>
  );
};

export default AboutPage;
