'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import GoatHornImage from '@/assets/goat-horn.webp';
import Image from 'next/image';
import Link from 'next/link';

const AboutPage = () => {
  const router = useRouter();

  return (
    <div className='about-page flex flex-1 flex-col gap-2 py-8'>
      <div className='flex gap-2'>
        <button
          className='relative -mt-[2px] aspect-square h-[36px]'
          onClick={() => router.push('/')}
        >
          <Image src={GoatHornImage} alt='goat horn image' fill />
        </button>
        <h1 className='text-3xl font-bold'>About</h1>
      </div>
      <p>
        <b>Oh, snappers!</b> Welcome to Hermitcraft Horns! It means a lot to me
        that you're here. 🎉
      </p>
      <p>
        As an avid viewer of Hermitcraft, I found myself seeing the same two
        sentiments echoed over and over in the comment sections of the hermits'
        videos: "That would make a great horn!" & "What episode is that horn
        from?"
      </p>
      <p>
        & since there isn't a place to easily create & share those moments, I
        made one!
      </p>
      <p>
        Here, you can easily load up any YouTube video in the&nbsp;
        <Link href='/create' className='underline'>
          Create
        </Link>
        &nbsp;tab & create as many downloadable horns of all of your favorite
        Hermit quotes as you want, along with viewing others' favorite quotes
        too! Download as many as you want & use them in your own servers!
      </p>
      <p>
        On top of that, you can find the context of any horn by simply clicking
        'View clip' on a horn & the source video will be automatically loaded
        into the{' '}
        <Link href='/create' className='underline'>
          Create
        </Link>{' '}
        tab with the clip already set up for you so you won't have to wonder
        what episode & how far into the episode it's from! Whether it's from a
        short, an episode or a full stream, you can easily find the context of
        any horn!
      </p>
      <p>
        & of course, this is just the initial release of the site. There will be
        many optimizations & additional features added as our horn collection
        gets bigger, so this is just the beginning.
      </p>
      <p>
        The code is open source so if you're a coder, feel free to check out the{' '}
        <a
          href='https://github.com/dreadhalor/hermitcraft-horns'
          target='_blank'
          rel='noreferrer'
          className='underline'
        >
          Hermitcraft Horns GitHub repo
        </a>{' '}
        & give it a star! 🌟
      </p>
      <p>
        If you have any suggestions, feedback, or issues, feel free to reach out
        to me on Twitter at{' '}
        <a
          href='https://twitter.com/scotthetrick'
          target='_blank'
          rel='noreferrer'
          className='underline'
        >
          @scotthetrick
        </a>
      </p>
    </div>
  );
};

export default AboutPage;
