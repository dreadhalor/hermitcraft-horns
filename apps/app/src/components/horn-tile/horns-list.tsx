'use client';

import React, { Fragment, useState } from 'react';
import { Card } from '@ui/card';
import { HornTile } from './horn-tile';
import { trpc } from '@/trpc/client';
import { useHHUser } from '@/providers/user-provider';
import { FaSliders } from 'react-icons/fa6';
import { Button } from '@ui/button';
import { Hermit } from '@drizzle/db';
import { useApp } from '@/providers/app-provider';
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
import { getPaginationRange } from '@/lib/utils';
import { SelectHermit } from './select-hermit';
import { useForm } from 'react-hook-form';
import { Form } from '@ui/form';
import { Sheet, SheetContent, SheetTrigger } from '@ui/sheet';

interface Props {
  id?: string;
}

export const HornsList = ({ id }: Props) => {
  const { user } = useHHUser();
  const { hermits } = useApp();
  const [selectedHermit, setSelectedHermit] = useState<Hermit | null>(null);

  const [selectedSort, setSelectedSort] = useState<string>('newest');
  const [selectedPage, setSelectedPage] = useState<number>(1);

  const form = useForm();

  const { data, isLoading } = trpc.getPaginatedClips.useQuery({
    userId: user?.id ?? '',
    filterUserId: id,
    hermitId: selectedHermit?.ChannelID ?? undefined,
    sort: selectedSort,
    page: selectedPage,
    limit: 20,
  });

  const { clips, totalPages = 5 } = data ?? {};

  const range = getPaginationRange({
    currentPage: selectedPage,
    totalPages,
  });

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
        <Form {...form}>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant='ghost' className='text-white'>
                <FaSliders className='mr-2' />
                Filters
                {selectedHermit ? ` (1)` : ''}
              </Button>
            </SheetTrigger>
            <SheetContent
              side='bottom'
              className='rounded-t-2xl border-0 p-0 pt-4'
            >
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
                className='text-md h-[60px] w-full gap-2 rounded-none hover:bg-[#4665BA] hover:text-white'
                // onClick={handleDownload}
              >
                Time Posted: All Time
              </Button>
            </SheetContent>
          </Sheet>
        </Form>
      </div>
      <div className='grid w-full grid-cols-2 gap-[10px]'>
        {clips.map((clip: any) => (
          <HornTile key={clip.id} horn={clip} />
        ))}
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
