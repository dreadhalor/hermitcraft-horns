'use client';
import JoeHills from '@/assets/hermits/joehills.jpeg';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { HornTileMenu } from './horn-tile-menu';

type HornPreviewTileProps = {
  horn: any;
  className?: string;
  onClick?: () => void;
};

export const HornPreviewTile = ({
  horn,
  className,
  onClick,
}: HornPreviewTileProps) => {
  const { tagline, season, profilePic = '', user: _givenUser, hermit } = horn;
  const { username } = _givenUser ?? {};
  const _profilePic = profilePic || hermit?.ProfilePicture || JoeHills.src;

  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayClick = () => {
    if (onClick) {
      onClick();
      setIsPlaying(true);
    }
  };

  return (
    <div
      className={cn(
        'relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg bg-[#354B87] text-[12px] text-white',
        className,
      )}
    >
      <HornTileBorder isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
      <div
        className='absolute inset-0 flex items-center justify-center p-[4px] brightness-[60%]'
        onClick={handlePlayClick}
      >
        <div className='relative h-full w-full overflow-hidden rounded-md'>
          <Image src={_profilePic} alt='profile pic' fill />
        </div>
      </div>
      <div className='pointer-events-none absolute inset-0 p-[8px]'>
        <div className='flex h-full w-full flex-col p-[4px]'>
          <div className='flex justify-between'>
            <span className='text-[10px]'>{username ?? 'no user'}</span>
            <HornTileMenu horn={horn} />
          </div>
          <span className='my-auto text-center font-bold'>{tagline}</span>
          <div className='flex justify-center'>
            {season && <span className='mr-auto text-center'>S{season}</span>}
            <span className='text-center'>View clip &rarr;</span>
          </div>
        </div>
      </div>
    </div>
  );
};

type HornTileBorderProps = {
  isPlaying: boolean;
  setIsPlaying: (value: boolean) => void;
};

const HornTileBorder = ({ isPlaying, setIsPlaying }: HornTileBorderProps) => {
  const tileRef = useRef<HTMLDivElement | null>(null);
  const [percentage, setPercentage] = useState(0);

  const createArcPath = (percentage: number) => {
    const tile = tileRef.current;
    if (!tile) return '';

    const radius = Math.max(tile.offsetWidth, tile.offsetHeight) * 2;
    const centerX = tile.offsetWidth / 2;
    const centerY = tile.offsetHeight / 2;

    const startAngle = -90;
    const endAngle = (percentage / 100) * 360 - 90;

    const startX = centerX + radius * Math.cos(startAngle * (Math.PI / 180));
    const startY = centerY + radius * Math.sin(startAngle * (Math.PI / 180));
    const endX = centerX + radius * Math.cos(endAngle * (Math.PI / 180));
    const endY = centerY + radius * Math.sin(endAngle * (Math.PI / 180));

    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    const d = cn(
      `M ${centerX} ${centerY}`,
      `L ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `L ${centerX} ${centerY}`,
    );

    return d;
  };

  useEffect(() => {
    let animationFrameId: number | null = null;

    const animate = () => {
      if (isPlaying && percentage < 100) {
        setPercentage((prevPercentage) => prevPercentage + 0.5);
        animationFrameId = requestAnimationFrame(animate);
      } else if (percentage >= 100) {
        setIsPlaying(false);
        setPercentage(0);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, percentage, setIsPlaying]);

  return (
    <div
      ref={tileRef}
      className={cn(
        'pointer-events-none absolute inset-0 rounded-lg border-white',
        percentage > 0 && 'border-2',
      )}
      style={{
        clipPath: `path('${createArcPath(percentage)}')`,
      }}
    />
  );
};
