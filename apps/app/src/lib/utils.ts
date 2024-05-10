import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');

  const hasHours = hours > 0;
  return hasHours
    ? `${formattedHours}:${formattedMinutes}:${formattedSeconds}`
    : `${formattedMinutes}:${formattedSeconds}`;
};

export const getYouTubeId = (url: string) => {
  const urlParams = new URLSearchParams(new URL(url).search);
  return urlParams.get('v');
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
