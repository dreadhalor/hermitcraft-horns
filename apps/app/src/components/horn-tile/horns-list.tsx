'use client';

import React, { Fragment, useEffect, useState } from 'react';
import { Card } from '@ui/card';
import { HornTile } from './horn-tile';
import { trpc } from '@/trpc/client';
import { useHHUser } from '@/providers/user-provider';
import { Hermit } from '@drizzle/db';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@ui/pagination';
import { TimeRange, getPaginationRange } from '@/lib/utils';
import { HornFilters } from './horn-filters/horn-filters';
import { Button } from '@ui/button';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/providers/app-provider-client';

interface Props {
  id?: string;
  favorites?: boolean;
  emptyMessage?: string | React.ReactNode;
  useParams?: boolean; // Whether or not the URL params hold state
}

export const HornsList = ({
  id,
  favorites = false,
  emptyMessage,
  useParams = false, // Default value is false
}: Props) => {
  const { user } = useHHUser();
  const { hermits } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialPage = useParams
    ? parseInt(searchParams.get('page') || '1', 10)
    : 1;
  const initialHermitName = useParams ? searchParams.get('hermit') || '' : '';
  const initialSort = useParams
    ? searchParams.get('sort') || 'newest'
    : 'newest';
  const initialTime = useParams
    ? searchParams.get('time') || 'allTime'
    : 'allTime';
  const initialQuote = useParams ? searchParams.get('quote') || '' : '';
  const initialSeason = useParams ? searchParams.get('season') || 'all' : 'all';

  const [selectedSort, setSelectedSort] = useState<string>(initialSort);
  const [selectedHermit, setSelectedHermit] = useState<Hermit | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(
    initialQuote || null,
  );
  const [selectedTime, setSelectedTime] = useState<TimeRange>(
    initialTime as TimeRange,
  );
  const [selectedSeason, setSelectedSeason] = useState<string>(initialSeason);

  const [selectedPage, setSelectedPage] = useState<number>(initialPage);

  useEffect(() => {
    if (initialHermitName) {
      const hermit = hermits.find((h) => h.ChannelName === initialHermitName);
      setSelectedHermit(hermit || null);
    }
  }, [initialHermitName, hermits]);

  const { data, isLoading } = trpc.getPaginatedClips.useQuery({
    userId: user?.id ?? '',
    filterUserId: id,
    hermitId: selectedHermit?.ChannelID ?? undefined,
    sort: selectedSort,
    page: selectedPage,
    timeFilter: selectedTime,
    season: selectedSeason === 'all' ? '' : selectedSeason,
    likedOnly: favorites,
    searchTerm: selectedQuote || undefined,
  });

  const { clips, totalPages = 5 } = data ?? {};

  const range =
    getPaginationRange({
      currentPage: selectedPage,
      totalPages,
    }) ?? [];

  useEffect(() => {
    if (useParams) {
      const currentPage = parseInt(searchParams.get('page') || '1', 10);
      if (currentPage !== selectedPage) {
        setSelectedPage(currentPage);
      }
    }
  }, [searchParams, selectedPage, useParams]);

  const updateURL = (params: URLSearchParams) => {
    if (params.get('page') === '1') {
      params.delete('page');
    }
    if (params.get('time') === 'allTime') {
      params.delete('time');
    }
    if (params.get('sort') === 'newest') {
      params.delete('sort');
    }
    if (params.get('quote') === '') {
      params.delete('quote');
    }
    if (params.get('season') === 'all') {
      params.delete('season');
    }
    const queryString = params.toString();
    router.replace(`?${queryString}`);
  };

  const resetPageAndFilters = (params: URLSearchParams) => {
    setSelectedPage(1);
    if (useParams) {
      params.set('page', '1');
      updateURL(params);
    }
  };

  const handlePageChange = (page: number) => {
    setSelectedPage(page);
    if (useParams) {
      const params = new URLSearchParams(searchParams);
      if (page === 1) {
        params.delete('page');
      } else {
        params.set('page', page.toString());
      }
      updateURL(params);
    }
  };

  const handleHermitChange = (hermit: Hermit | null) => {
    setSelectedHermit(hermit);
    if (useParams) {
      const params = new URLSearchParams(searchParams);
      if (hermit) {
        params.set('hermit', hermit.ChannelName);
      } else {
        params.delete('hermit');
      }
      resetPageAndFilters(params);
    } else setSelectedPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSelectedSort(sort);

    if (useParams) {
      const params = new URLSearchParams(searchParams);
      params.set('sort', sort);
      resetPageAndFilters(params);
    } else setSelectedPage(1);
  };

  const handleTimeChange = (time: TimeRange) => {
    setSelectedTime(time);
    if (useParams) {
      const params = new URLSearchParams(searchParams);
      params.set('time', time);
      resetPageAndFilters(params);
    } else setSelectedPage(1);
  };

  const handleQuoteChange = (quote: string | null) => {
    setSelectedQuote(quote);
    if (useParams) {
      const params = new URLSearchParams(searchParams);
      if (quote) {
        params.set('quote', quote);
      } else {
        params.delete('quote');
      }
      resetPageAndFilters(params);
    } else setSelectedPage(1);
  };

  const handleSeasonChange = (season: string) => {
    setSelectedSeason(season);
    if (useParams) {
      const params = new URLSearchParams(searchParams);
      if (season) {
        params.set('season', season);
      } else {
        params.delete('season');
      }
      resetPageAndFilters(params);
    } else setSelectedPage(1);
  };

  const handleClearFilters = () => {
    setSelectedHermit(null);
    setSelectedTime('allTime');
    setSelectedQuote(null);
    setSelectedSeason('all');
    if (useParams) {
      const params = new URLSearchParams(searchParams);
      params.delete('hermit');
      params.delete('time');
      params.delete('quote');
      params.delete('season');
      resetPageAndFilters(params);
    } else setSelectedPage(1);
  };

  if (isLoading || !clips) {
    return <div>Loading...</div>;
  }

  return (
    <Card className='flex w-full flex-col gap-[10px] overflow-hidden rounded-lg border-none bg-[#4665BA] p-[20px] text-white'>
      {selectedQuote && (
        <div className='flex items-baseline pb-2 text-start'>
          Quote search:&nbsp;<strong>{selectedQuote}</strong>
          <Button
            variant='link'
            className='ml-auto p-0 text-xs text-white'
            onClick={() => handleQuoteChange(null)}
          >
            Clear
          </Button>
        </div>
      )}
      <div className='flex items-center justify-between'>
        <Select value={selectedSort} onValueChange={handleSortChange}>
          <SelectTrigger className='w-[160px]'>
            <SelectValue placeholder='Sort by' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='most_liked'>Most Liked</SelectItem>
            <SelectItem value='most_downloaded'>Most Downloaded</SelectItem>
            <SelectItem value='newest'>Newest</SelectItem>
          </SelectContent>
        </Select>
        <HornFilters
          {...{
            selectedHermit,
            setSelectedHermit: handleHermitChange,
            selectedTime,
            setSelectedTime: handleTimeChange,
            selectedQuote,
            setSelectedQuote: handleQuoteChange,
            selectedSeason,
            setSelectedSeason: handleSeasonChange,
            clearFilters: handleClearFilters,
          }}
        />
      </div>
      <div className='grid w-full grid-cols-2 gap-[10px] sm:grid-cols-3'>
        {clips.map((clip: any) => (
          <HornTile key={clip.id} horn={clip} />
        ))}
        {clips.length === 0 && (
          <div className='col-span-2 mt-4 text-center sm:col-span-3'>
            {emptyMessage || 'No horns found matching these filters!'}
          </div>
        )}
      </div>
      <Pagination className='w-full'>
        <PaginationContent className='px-4'>
          {range.map((page, index) => (
            <Fragment key={index}>
              {index > 0 && page - range[index - 1]! > 1 && (
                <PaginationEllipsis className='w-4' />
              )}
              <PaginationItem className='cursor-pointer'>
                <PaginationLink
                  className='h-[28px] w-[28px]'
                  isActive={page === selectedPage}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
              {index === range.length - 1 && page < totalPages && (
                <PaginationEllipsis className='w-4' />
              )}
            </Fragment>
          ))}
        </PaginationContent>
      </Pagination>
    </Card>
  );
};
