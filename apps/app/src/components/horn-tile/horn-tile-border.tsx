import { useRef } from 'react';
import { cn } from '@/lib/utils';

type HornTileBorderProps = {
  progress: number;
  color: string;
};

export const HornTileBorder = ({ progress, color }: HornTileBorderProps) => {
  const tileRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div
      ref={tileRef}
      className={cn(
        'pointer-events-none absolute inset-0 rounded-lg',
        progress > 0 && 'border-2',
      )}
      style={{
        borderColor: color,
        clipPath: `path('${createArcPath(progress)}')`,
      }}
    />
  );
};
