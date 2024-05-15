import React from 'react';
import { SelectHermitGrid } from '../select-hermit-grid';
import { Hermit } from '@drizzle/db';
import { Button } from '@ui/button';

interface Props {
  selectedHermit: Hermit | null;
  onSelect: (hermit: Hermit | null) => void;
}
export const HermitFilter = ({ selectedHermit, onSelect }: Props) => {
  return (
    <>
      <div className='flex-1 overflow-auto'>
        <SelectHermitGrid
          field={{ value: selectedHermit, onChange: onSelect }}
          noneLabel='All'
        />
      </div>
    </>
  );
};
