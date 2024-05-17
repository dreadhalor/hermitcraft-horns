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

interface Props {
  id?: string;
  favorites?: boolean;
  emptyMessage?: string | React.ReactNode;
}

export const HornsList = ({ id, favorites = false, emptyMessage }: Props) => {
  const { user } = useHHUser();

  const [selectedSort, setSelectedSort] = useState<string>('newest');
  const [selectedHermit, setSelectedHermit] = useState<Hermit | null>(null);
  const [selectedTime, setSelectedTime] = useState<TimeRange>('allTime');
  const [selectedPage, setSelectedPage] = useState<number>(1);

  const { data, isLoading } = trpc.getPaginatedClips.useQuery({
    userId: user?.id ?? '',
    filterUserId: id,
    hermitId: selectedHermit?.ChannelID ?? undefined,
    sort: selectedSort,
    page: selectedPage,
    timeFilter: selectedTime,
    likedOnly: favorites,
  });

  const { clips, totalPages = 5 } = data ?? {};

  const range = getPaginationRange({
    currentPage: selectedPage,
    totalPages,
  });

  useEffect(() => {
    setSelectedPage(1);
  }, [selectedSort, selectedTime, selectedHermit]);

  if (isLoading || !clips) {
    return <div>Loading...</div>;
  }

  return (
    <Card className='flex w-full flex-col gap-[10px] overflow-hidden rounded-lg border-none bg-[#4665BA] p-[20px] text-white'>
      <div className='flex items-center justify-between'>
        <Select value={selectedSort} onValueChange={setSelectedSort}>
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
            setSelectedHermit,
            selectedTime,
            setSelectedTime,
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
              {index > 0 && page - range[index - 1] > 1 && (
                <PaginationEllipsis />
              )}
              <PaginationItem className='cursor-pointer'>
                <PaginationLink
                  isActive={page === selectedPage}
                  onClick={() => setSelectedPage(page)}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
              {index === range.length - 1 && page < totalPages && (
                <PaginationEllipsis />
              )}
            </Fragment>
          ))}
        </PaginationContent>
      </Pagination>
    </Card>
  );
};
