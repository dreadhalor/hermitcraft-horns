import { TimeRange, cn } from '@/lib/utils';
import { Hermit } from '@drizzle/db';
import React from 'react';
import { Form } from '@ui/form';
import { useForm } from 'react-hook-form';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@ui/sheet';
import { Button } from '@ui/button';
import { FaSliders } from 'react-icons/fa6';
import { Tabs, TabsContent } from '@ui/tabs';
import { TimeFilter } from './time-filter';
import { Separator } from '@ui/separator';
import { IoCalendarOutline } from 'react-icons/io5';
import { FaRegUser } from 'react-icons/fa6';
import { HermitFilter } from './hermit-filter';

interface Props {
  selectedHermit: Hermit | null;
  setSelectedHermit: (hermit: Hermit | null) => void;
  selectedTime: TimeRange;
  setSelectedTime: (time: TimeRange) => void;
}
export const HornFilters = ({
  selectedHermit,
  setSelectedHermit,
  selectedTime,
  setSelectedTime,
}: Props) => {
  const form = useForm();

  const [tab, setTab] = React.useState('main');
  const numFilters =
    (selectedHermit ? 1 : 0) + (selectedTime !== 'allTime' ? 1 : 0);

  return (
    <Form {...form}>
      <Sheet
        onOpenChange={(open) => {
          if (!open) setTab('main');
        }}
      >
        <SheetTrigger asChild>
          <Button variant='ghost' className='text-white'>
            <FaSliders className='mr-2' />
            Filters
            {numFilters > 0 && `: ${numFilters}`}
          </Button>
        </SheetTrigger>
        <SheetContent side='bottom' className='rounded-t-lg border-0 p-0'>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsContent value='main' className='data-[state=active]:pt-[8px]'>
              <SheetHeader className='mb-2 px-4 text-start text-sm uppercase text-gray-600'>
                Filter Clips by
              </SheetHeader>
              <Separator className='mx-4 w-auto bg-gray-600' />
              <Button
                variant='ghost'
                className='text-md h-[60px] w-full justify-start gap-2 rounded-none hover:bg-[#4665BA] hover:text-white'
                onClick={() => setTab('hermit-select')}
              >
                <FaRegUser size={24} />
                Hermit:{' '}
                {selectedHermit ? (
                  <>
                    <img
                      src={selectedHermit.ProfilePicture}
                      alt={selectedHermit.DisplayName}
                      className='aspect-square w-[40px]'
                    />
                    {selectedHermit.DisplayName}
                  </>
                ) : (
                  'All'
                )}
              </Button>
              <Button
                variant='ghost'
                className='text-md h-[60px] w-full justify-start gap-2 rounded-none capitalize hover:bg-[#4665BA] hover:text-white'
                onClick={() => setTab('time-select')}
              >
                <IoCalendarOutline size={24} />
                Time Posted: {selectedTime.replace(/([A-Z])/g, ' $1')}
              </Button>
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
            <TabsContent
              value='time-select'
              className='data-[state=active]:pt-[8px]'
            >
              <SheetHeader className='mb-2 px-4 text-start text-sm uppercase text-gray-600'>
                Clips Posted from
              </SheetHeader>
              <Separator className='mx-4 w-auto bg-gray-600' />
              <TimeFilter
                selectedTime={selectedTime}
                setSelectedTime={setSelectedTime}
              />
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
            <TabsContent
              value='hermit-select'
              className='flex max-h-[70vh] flex-col data-[state=active]:pt-[8px]'
            >
              <SheetHeader className='mb-2 px-4 text-start text-sm uppercase text-gray-600'>
                Horn spoken by
              </SheetHeader>
              <Separator className='mx-4 w-auto bg-gray-600' />
              <HermitFilter
                selectedHermit={selectedHermit}
                onSelect={setSelectedHermit}
              />
              <div className='flex shrink-0 p-2 pt-1'>
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
    </Form>
  );
};