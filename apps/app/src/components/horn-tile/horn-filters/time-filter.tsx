import React from 'react';
import { SheetClose } from '@ui/sheet';
import { Button } from '@ui/button';
import { TimeRange, cn } from '@/lib/utils';
import {
  MdOutlineRadioButtonUnchecked,
  MdOutlineRadioButtonChecked,
} from 'react-icons/md';

interface TimeOptionProps {
  time: TimeRange;
  label?: string;
  selectedTime: string;
  setSelectedTime: (time: TimeRange) => void;
}
const TimeOption = ({
  time,
  label,
  selectedTime,
  setSelectedTime,
}: TimeOptionProps) => {
  const isSelected = selectedTime === time;
  return (
    <SheetClose asChild>
      <Button
        variant='ghost'
        className={cn(
          'text-md h-[60px] w-full justify-start gap-2 rounded-none hover:bg-[#4665BA] hover:text-white',
          isSelected && 'bg-[#4665BA] text-white',
        )}
        onClick={() => setSelectedTime(time)}
      >
        {isSelected ? (
          <MdOutlineRadioButtonChecked className='text-2xl' />
        ) : (
          <MdOutlineRadioButtonUnchecked className='text-2xl' />
        )}
        {label ?? time}
      </Button>
    </SheetClose>
  );
};

interface Props {
  selectedTime: string;
  setSelectedTime: (time: TimeRange) => void;
}
export const TimeFilter = ({ selectedTime, setSelectedTime }: Props) => {
  return (
    <>
      <TimeOption
        time='today'
        label='Today'
        selectedTime={selectedTime}
        setSelectedTime={setSelectedTime}
      />
      <TimeOption
        time='thisWeek'
        label='This week'
        selectedTime={selectedTime}
        setSelectedTime={setSelectedTime}
      />
      <TimeOption
        time='thisMonth'
        label='This month'
        selectedTime={selectedTime}
        setSelectedTime={setSelectedTime}
      />
      <TimeOption
        time='allTime'
        label='All time'
        selectedTime={selectedTime}
        setSelectedTime={setSelectedTime}
      />
    </>
  );
};
