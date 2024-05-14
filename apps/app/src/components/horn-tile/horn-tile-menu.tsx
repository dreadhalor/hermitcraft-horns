import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@ui/sheet';
import { Button } from '@ui/button';
import { FaHeart, FaRegHeart, FaEdit } from 'react-icons/fa';
import { MdFileDownload } from 'react-icons/md';
import { useHHUser } from '@/providers/user-provider';
import { Tabs, TabsContent } from '@ui/tabs';
import { useState } from 'react';
import { HornEditMenu } from './horn-edit-menu';
import { kebabIt } from '@/lib/utils';

type Props = {
  horn: any;
};

export const HornTileMenu = ({ horn }: Props) => {
  const [activeTab, setActiveTab] = useState('main');
  const { liked, likes, downloads, clipUrl = '' } = horn;
  const { user, likeClip, unlikeClip, incrementClipDownloads } = useHHUser();

  const toggleLike = () => {
    if (liked) {
      unlikeClip(user?.id ?? '', horn.id);
    } else {
      likeClip(user?.id ?? '', horn.id);
    }
  };

  const handleDownload = () => {
    incrementClipDownloads(horn.id);
    // ya gotta do it indirectly like this to let you set the filename
    fetch(clipUrl)
      .then((response) => response.blob())
      .then((blob) => {
        // Create a temporary URL for the downloaded file
        const url = window.URL.createObjectURL(blob);

        // Create a link element and trigger the download
        const link = document.createElement('a');
        link.href = url;
        link.download = `${kebabIt(horn.tagline)}.mp3`;
        link.click();

        // Clean up the temporary URL
        window.URL.revokeObjectURL(url);
      })
      .catch((error) => {
        console.error('Error downloading the file:', error);
      });
  };

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) setActiveTab('main');
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
        className='max-h-[90%] overflow-hidden rounded-t-2xl border-0 p-0'
        side='bottom'
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value='main'>
            <SheetClose asChild>
              <Button
                variant='ghost'
                className='text-md h-[60px] w-full gap-2 rounded-none hover:bg-[#4665BA] hover:text-white'
                onClick={toggleLike}
              >
                {liked ? (
                  <>
                    <FaHeart /> Unfavorite
                  </>
                ) : (
                  <>
                    <FaRegHeart /> Favorite
                  </>
                )}
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button
                variant='ghost'
                className='text-md h-[60px] w-full gap-2 rounded-none hover:bg-[#4665BA] hover:text-white'
                onClick={handleDownload}
              >
                <MdFileDownload size={22} /> Download
              </Button>
            </SheetClose>
            <Button
              variant='ghost'
              className='text-md h-[60px] w-full gap-2 rounded-none hover:bg-[#4665BA] hover:text-white'
              onClick={() => setActiveTab('edit')}
            >
              <FaEdit size={16} /> Edit
            </Button>
          </TabsContent>
          <TabsContent value='edit'>
            <HornEditMenu setActiveTab={setActiveTab} horn={horn} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
