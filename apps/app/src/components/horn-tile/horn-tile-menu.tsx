import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '@ui/drawer';
import { Button } from '@ui/button';
import { FaHeart, FaRegHeart, FaEdit } from 'react-icons/fa';
import { MdFileDownload } from 'react-icons/md';
import { useHHUser } from '@/providers/user-provider';
import { Tabs, TabsContent } from '@ui/tabs';
import { useState } from 'react';
import { HornEditMenu } from './horn-edit-menu';

type Props = {
  horn: any;
};
export const HornTileMenu = ({ horn }: Props) => {
  const [activeTab, setActiveTab] = useState('main');

  const { liked, likes, downloads } = horn;
  const { user, likeClip, unlikeClip, incrementClipDownloads } = useHHUser();

  const toggleLike = () => {
    if (liked) {
      unlikeClip(user?.id ?? '', horn.id);
    } else {
      likeClip(user?.id ?? '', horn.id);
    }
  };

  return (
    <Drawer nested onClose={() => setActiveTab('main')}>
      <DrawerTrigger asChild>
        <Button
          id='clip-builder-hermit'
          className='pointer-events-auto -mx-1 -my-0.5 grid h-auto w-auto grid-cols-2 items-center justify-items-end bg-transparent px-1 py-0.5 text-[12px] shadow-none hover:bg-primary/80'
        >
          <span>{likes ?? '53'}</span>
          {liked ? <FaHeart /> : <FaRegHeart />}
          <span>{downloads ?? 101}</span>
          <MdFileDownload className='-mr-0.5' size={16} />
        </Button>
      </DrawerTrigger>
      <DrawerContent className='max-h-[90%] border-0 p-0'>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value='main'>
            <DrawerClose asChild>
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
            </DrawerClose>
            <DrawerClose asChild>
              <Button
                variant='ghost'
                className='text-md h-[60px] w-full gap-2 rounded-none hover:bg-[#4665BA] hover:text-white'
                onClick={() => incrementClipDownloads(horn.id)}
              >
                <MdFileDownload size={22} /> Download
              </Button>
            </DrawerClose>
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
      </DrawerContent>
    </Drawer>
  );
};
