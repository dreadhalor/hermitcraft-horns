import React from 'react';
import GoatHornImage from '@/assets/goat-horn.webp';
import Image from 'next/image';
import Link from 'next/link';
import { FaGithub, FaSquareXTwitter } from 'react-icons/fa6';
import { IoPizzaSharp } from 'react-icons/io5';
import { FaCoffee } from 'react-icons/fa';
import { cn } from '@/lib/utils';

const AboutPage = () => {
  return (
    <div className='about-page flex flex-1 flex-col gap-6 px-8 py-8 sm:px-0'>
      <div className='flex items-center gap-4'>
        <Link
          href='/home'
          className={cn(
            'relative -mt-[2px] aspect-square h-[48px] transition-transform duration-300 ease-in-out hover:scale-110',
          )}
        >
          <Image src={GoatHornImage} alt='goat horn image' fill />
        </Link>
        <h1 className='text-4xl font-bold text-gray-800'>About</h1>
        <div className='ml-auto flex gap-2'>
          <a
            href='https://www.scottjhetrick.com'
            className='transition-all hover:scale-110'
          >
            <IoPizzaSharp size={22} />
          </a>
          <a
            href='https://www.buymeacoffee.com/dreadhalor'
            className='transition-all hover:scale-110'
          >
            <FaCoffee size={22} />
          </a>
          <a
            href='https://github.com/dreadhalor/hermitcraft-horns'
            className='transition-all hover:scale-110'
          >
            <FaGithub size={22} />
          </a>
          <a
            href='https://www.x.com/dreadhalor'
            className='transition-all hover:scale-110'
          >
            <FaSquareXTwitter size={22} />
          </a>
        </div>
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
          className='inline-flex items-baseline gap-1 text-blue-700 underline hover:text-blue-800'
        >
          <FaGithub size={20} className='self-center' /> Hermitcraft Horns
          GitHub repo
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
      <p className='text-lg text-gray-700'>
        & if you're feeling generous, you can{' '}
        <a
          href='https://www.buymeacoffee.com/dreadhalor'
          target='_blank'
          rel='noreferrer'
          className='text-blue-700 underline hover:text-blue-800'
        >
          buy me a coffee
        </a>{' '}
        to help keep me awake & coding! ☕️ As amazing as the Hermitcraft
        community has been in adopting this site, all the traffic does mean this
        site is no longer cheap to run & since I&apos;m unemployed at the moment
        I could use all the help I can get to keep it running smoothly!
      </p>
      <p className='text-lg text-gray-700'>
        Speaking of which, if anyone's looking for a software engineer...{' '}
        <a
          href='https://scottjhetrick.com'
          target='_blank'
          rel='noreferrer'
          className='text-blue-700 underline hover:text-blue-800'
        >
          I'm ✨recently unemployed & could use a job✨
        </a>{' '}
        😉
      </p>
    </div>
  );
};

export default AboutPage;
