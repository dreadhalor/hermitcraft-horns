import React from 'react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@ui/sheet';
import { Button } from '@ui/button';
import { FaHeart, FaRegHeart, FaEdit } from 'react-icons/fa';
import { MdFileDownload } from 'react-icons/md';
import { useHHUser } from '@/providers/user-provider';
import { Tabs, TabsContent } from '@ui/tabs';
import { HornEditMenu } from './horn-edit-menu';
import { kebabIt } from '@/lib/utils';
import { Separator } from '@ui/separator';
import { DBClip } from '@drizzle/db';

type Props = {
  horn: DBClip;
};

export const HornTileMenu = ({ horn }: Props) => {
  const [tab, setTab] = React.useState('main');
  const { liked, likes, downloads, user: hornUser } = horn;
  const clipUrl = horn.clipUrl ?? '';
  const tagline = horn.tagline ?? '';
  const { user, likeClip, unlikeClip, incrementClipDownloads } = useHHUser();
  const isOwner = user?.id === hornUser?.id;

  const toggleLike = () => {
    if (liked) {
      unlikeClip(user?.id ?? '', horn.id);
    } else {
      likeClip(user?.id ?? '', horn.id);
    }
  };

  const handleDownload = () => {
    incrementClipDownloads(horn.id);
    fetch(clipUrl)
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${kebabIt(tagline)}.mp3`;
        link.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((error) => {
        console.error('Error downloading the file:', error);
      });
  };

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) setTab('main');
      }}
    >
      <SheetTrigger asChild>
        <Button
          id='clip-builder-hermit'
          className='pointer-events-auto -mx-1 -my-0.5 grid h-auto w-auto grid-cols-2 items-center justify-items-end bg-transparent px-1 py-0.5 text-[12px] shadow-none hover:bg-primary/80'
        >
          <span>{likes ?? '53'}</span>
          {liked ? <FaHeart /> : <FaRegHeart />}
          <span>{downloads ?? 101}</span>
          <MdFileDownload className='-mr-0.5' size={16} />
        </Button>
      </SheetTrigger>
      <SheetContent
        className='max-h-[90%] overflow-hidden rounded-t-lg border-0 p-0'
        side='bottom'
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsContent value='main' className='data-[state=active]:pt-[10px]'>
            <SheetHeader className='mb-2 px-4 text-start text-sm uppercase text-gray-600'>
              Horn Actions
            </SheetHeader>
            <Separator className='mx-4 w-auto bg-gray-600' />
            <SheetClose asChild>
              <Button
                variant='ghost'
                className='text-md h-[60px] w-full justify-start gap-2 rounded-none hover:bg-[#4665BA] hover:text-white'
                onClick={toggleLike}
              >
                {liked ? (
                  <>
                    <FaHeart className='mr-1' /> Unfavorite
                  </>
                ) : (
                  <>
                    <FaRegHeart className='mr-1' /> Favorite
                  </>
                )}
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button
                variant='ghost'
                className='text-md h-[60px] w-full justify-start gap-2 rounded-none hover:bg-[#4665BA] hover:text-white'
                onClick={handleDownload}
              >
                <MdFileDownload size={22} className='ml-[-2px]' /> Download
              </Button>
            </SheetClose>
            {isOwner && (
              <Button
                variant='ghost'
                className='text-md h-[60px] w-full justify-start gap-2 rounded-none hover:bg-[#4665BA] hover:text-white'
                onClick={() => setTab('edit')}
              >
                <FaEdit size={16} className='ml-0.5 mr-1' /> Edit
              </Button>
            )}
            <div className='flex p-2 pt-1'>
              <SheetClose asChild>
                <Button
                  variant='outline'
                  className='h-[36px] flex-1 gap-2 rounded-full border-gray-600 text-sm hover:bg-[#4665BA] hover:text-white'
                >
                  Close
                </Button>
              </SheetClose>
            </div>
          </TabsContent>
          <TabsContent value='edit' className='data-[state=active]:pt-[10px]'>
            <SheetHeader className='mb-2 px-4 text-start text-sm uppercase text-gray-600'>
              Edit Horn
            </SheetHeader>
            <Separator className='mx-4 w-auto bg-gray-600' />
            <HornEditMenu horn={horn} />
            <div className='flex p-2 pt-1'>
              <Button
                variant='outline'
                className='h-[36px] flex-1 gap-2 rounded-full border-gray-600 text-sm hover:bg-[#4665BA] hover:text-white'
                onClick={() => setTab('main')}
              >
                &larr; Back
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
