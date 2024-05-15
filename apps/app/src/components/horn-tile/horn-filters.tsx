import { TimeRange, cn } from '@/lib/utils';
import { Hermit } from '@drizzle/db';
import React from 'react';
import { Form } from '@ui/form';
import { useForm } from 'react-hook-form';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@ui/sheet';
import { Button } from '@ui/button';
import { FaSliders } from 'react-icons/fa6';
import { SelectHermit } from './select-hermit';
import { useApp } from '@/providers/app-provider';
import { Tabs, TabsContent, TabsTrigger } from '@ui/tabs';

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
  const { hermits } = useApp();

  const [tab, setTab] = React.useState('main');
  const numFilters = selectedHermit
    ? 1
    : 0 + (selectedTime !== 'allTime' ? 1 : 0);

  return (
    <Form {...form}>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant='ghost' className='text-white'>
            <FaSliders className='mr-2' />
            Filters
            {numFilters > 0 && `: ${numFilters}`}
          </Button>
        </SheetTrigger>
        <SheetContent side='bottom' className='rounded-t-2xl border-0 p-0 pt-4'>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsContent value='main'>
              <SelectHermit hermits={hermits} onSelect={setSelectedHermit}>
                <Button
                  variant='ghost'
                  className='text-md h-[60px] w-full gap-2 rounded-none hover:bg-[#4665BA] hover:text-white'
                >
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
              </SelectHermit>
              <Button
                variant='ghost'
                className='text-md h-[60px] w-full gap-2 rounded-none capitalize hover:bg-[#4665BA] hover:text-white'
                onClick={() => setTab('time-select')}
              >
                Time Posted: {selectedTime.replace(/([A-Z])/g, ' $1')}
              </Button>
              <SheetClose asChild>
                <Button
                  variant='ghost'
                  className='text-md h-[60px] w-full gap-2 rounded-none hover:bg-[#4665BA] hover:text-white'
                >
                  &larr; Close
                </Button>
              </SheetClose>
            </TabsContent>
            <TabsContent value='time-select'>
              <SheetClose asChild>
                <Button
                  variant='ghost'
                  className={cn(
                    'text-md h-[60px] w-full gap-2 rounded-none hover:bg-[#4665BA] hover:text-white',
                    selectedTime === 'today' && 'bg-[#4665BA] text-white',
                  )}
                  onClick={() => setSelectedTime('today')}
                >
                  Today
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button
                  variant='ghost'
                  className={cn(
                    'text-md h-[60px] w-full gap-2 rounded-none hover:bg-[#4665BA] hover:text-white',
                    selectedTime === 'thisWeek' && 'bg-[#4665BA] text-white',
                  )}
                  onClick={() => setSelectedTime('thisWeek')}
                >
                  This week
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button
                  variant='ghost'
                  className={cn(
                    'text-md h-[60px] w-full gap-2 rounded-none hover:bg-[#4665BA] hover:text-white',
                    selectedTime === 'thisMonth' && 'bg-[#4665BA] text-white',
                  )}
                  onClick={() => setSelectedTime('thisMonth')}
                >
                  This month
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button
                  variant='ghost'
                  className={cn(
                    'text-md h-[60px] w-full gap-2 rounded-none hover:bg-[#4665BA] hover:text-white',
                    selectedTime === 'allTime' && 'bg-[#4665BA] text-white',
                  )}
                  onClick={() => setSelectedTime('allTime')}
                >
                  All time
                </Button>
              </SheetClose>
              <Button
                variant='ghost'
                className='text-md h-[60px] w-full gap-2 rounded-none hover:bg-[#4665BA] hover:text-white'
                onClick={() => setTab('main')}
              >
                &larr; Back
              </Button>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </Form>
  );
};
