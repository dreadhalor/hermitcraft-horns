import { TimeRange } from '@/lib/utils';
import { Hermit } from '@drizzle/db';
import React from 'react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@ui/sheet';
import { Button } from '@ui/button';
import { FaSliders, FaRegClock } from 'react-icons/fa6';
import { Tabs, TabsContent } from '@ui/tabs';
import { TimeFilter } from './time-filter';
import { Separator } from '@ui/separator';
import { IoCalendarOutline, IoChatbubbleOutline } from 'react-icons/io5';
import { FaRegUser } from 'react-icons/fa6';
import { HermitFilter } from './hermit-filter';
import { QuoteSearch } from './quote-search';
import { SeasonFilter } from './season-filter';

interface FilterButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}
const FilterButton = ({ onClick, children }: FilterButtonProps) => {
  return (
    <Button
      variant='ghost'
      className='text-md col-span-2 grid h-[60px] w-full grid-cols-subgrid items-center justify-start gap-3 rounded-none text-start hover:bg-[#4665BA] hover:text-white'
      onClick={onClick}
    >
      {children}
    </Button>
  );
};
const FilterHeader = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <SheetHeader className='mb-2 px-4 text-start text-sm uppercase text-gray-600'>
        {children}
      </SheetHeader>
      <Separator className='mx-4 w-auto bg-gray-600' />
    </>
  );
};
const FilterBackButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className='flex shrink-0 p-2 pt-1'>
      <Button
        variant='outline'
        className='h-[36px] flex-1 gap-2 rounded-full border-gray-600 text-sm hover:bg-[#4665BA] hover:text-white'
        onClick={onClick}
      >
        &larr; Back
      </Button>
    </div>
  );
};

interface Props {
  selectedHermit: Hermit | null;
  setSelectedHermit: (hermit: Hermit | null) => void;
  selectedTime: TimeRange;
  setSelectedTime: (time: TimeRange) => void;
  selectedSeason: string;
  setSelectedSeason: (season: string) => void;
  selectedQuote: string | null;
  setSelectedQuote: (quote: string | null) => void;
  clearFilters: () => void;
}
export const HornFilters = ({
  selectedHermit,
  setSelectedHermit,
  selectedTime,
  setSelectedTime,
  selectedSeason,
  setSelectedSeason,
  selectedQuote,
  setSelectedQuote,
  clearFilters,
}: Props) => {
  const [tab, setTab] = React.useState('main');
  const numFilters =
    (selectedHermit ? 1 : 0) +
    (selectedTime !== 'allTime' ? 1 : 0) +
    (selectedSeason !== 'all' ? 1 : 0) +
    (selectedQuote ? 1 : 0);

  return (
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
          <TabsContent value='main' className='data-[state=active]:pt-[10px]'>
            <SheetHeader className='mb-2 flex flex-row items-center justify-between px-4 text-start text-sm uppercase text-gray-600'>
              Filter Clips by
              <SheetClose asChild>
                <Button
                  variant='link'
                  className='h-auto w-auto p-0 text-xs text-red-700'
                  onClick={clearFilters}
                >
                  clear filters
                </Button>
              </SheetClose>
            </SheetHeader>
            <Separator className='mx-4 w-auto bg-gray-600' />
            <div className='grid grid-cols-[auto_1fr]'>
              <FilterButton onClick={() => setTab('quote-search')}>
                <IoChatbubbleOutline size={24} className='shrink-0' />
                <span className='truncate'>
                  Quote: {selectedQuote ? `"${selectedQuote}"` : 'None'}
                </span>
              </FilterButton>
              <FilterButton onClick={() => setTab('hermit-select')}>
                <FaRegUser size={22} className='mx-auto' />
                <span className='flex items-center gap-2'>
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
                </span>
              </FilterButton>
              <FilterButton onClick={() => setTab('time-select')}>
                <FaRegClock size={20} className='mx-auto' />
                <span className='capitalize'>
                  Time Posted: {selectedTime.replace(/([A-Z])/g, ' $1')}
                </span>
              </FilterButton>
              <FilterButton onClick={() => setTab('season-select')}>
                <IoCalendarOutline size={24} />
                <span className='capitalize'>
                  Season:
                  {selectedSeason === 'all' ? ' All' : ` ${selectedSeason}`}
                </span>
              </FilterButton>
            </div>
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
            value='quote-search'
            className='flex flex-col data-[state=active]:pt-[10px]'
          >
            <FilterHeader>Search for quote</FilterHeader>
            <QuoteSearch
              selectedQuote={selectedQuote}
              setSelectedQuote={setSelectedQuote}
            />
            <FilterBackButton onClick={() => setTab('main')} />
          </TabsContent>
          <TabsContent
            value='time-select'
            className='data-[state=active]:pt-[10px]'
          >
            <FilterHeader>Time Posted</FilterHeader>
            <TimeFilter
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
            />
            <FilterBackButton onClick={() => setTab('main')} />
          </TabsContent>
          <TabsContent
            value='hermit-select'
            className='flex max-h-[70vh] flex-col data-[state=active]:pt-[10px]'
          >
            <FilterHeader>Horn spoken by</FilterHeader>
            <HermitFilter
              selectedHermit={selectedHermit}
              onSelect={setSelectedHermit}
            />
            <FilterBackButton onClick={() => setTab('main')} />
          </TabsContent>
          <TabsContent
            value='season-select'
            className='data-[state=active]:pt-[10px]'
          >
            <FilterHeader>Season</FilterHeader>
            <SeasonFilter
              selectedSeason={selectedSeason}
              setSelectedSeason={setSelectedSeason}
            />
            <FilterBackButton onClick={() => setTab('main')} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
