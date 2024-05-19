import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(milliseconds: number, granularity?: string): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const remainingMilliseconds = milliseconds % 1000;

  // Format remaining milliseconds with leading zeros
  let formattedMilliseconds = String(remainingMilliseconds).padStart(3, '0');

  // Remove trailing zeros from the milliseconds part
  formattedMilliseconds = formattedMilliseconds.replace(/0+$/, '');

  let timeString = '';

  if (hours > 0) {
    timeString += `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } else if (minutes > 0) {
    timeString += `${minutes}:${String(seconds).padStart(2, '0')}`;
  } else {
    timeString += `0:${String(seconds).padStart(2, '0')}`;
  }

  // Append milliseconds if there are any
  if (formattedMilliseconds && granularity !== 'seconds') {
    timeString += `.${formattedMilliseconds}`;
  }

  return timeString;
}
export function formatDuration(milliseconds: number): string {
  return `${milliseconds / 1000}s`;
}

export const getYouTubeId = (url: string) => {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const getPaginationRange = ({
  currentPage,
  totalPages,
  maxPages = 5,
}: {
  currentPage: number;
  totalPages: number;
  maxPages?: number;
}) => {
  const halfMaxPages = Math.floor(maxPages / 2);
  const start = Math.max(1, currentPage - halfMaxPages);
  const end = Math.min(totalPages, currentPage + halfMaxPages);

  const range = Array.from({ length: end - start + 1 }, (_, i) => i + start);

  if (range[0] > 1) {
    range.unshift(1);
  }

  if (range[range.length - 1] < totalPages) {
    range.push(totalPages);
  }

  return range;
};

export const kebabIt = (str: string) => {
  return str.replace(/\s+/g, '-').toLowerCase();
};

export const MAX_CLIP_LENGTH = 15;

export const TIME_RANGES = [
  'today',
  'thisWeek',
  'thisMonth',
  'allTime',
] as const;
export type TimeRange = (typeof TIME_RANGES)[number];
