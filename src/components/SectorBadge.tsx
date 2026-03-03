import React from 'react';
import { Sector, SECTOR_COLORS } from '@/lib/types';

const SectorBadge = React.forwardRef<HTMLSpanElement, { sector: Sector }>(
  ({ sector, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SECTOR_COLORS[sector]}`}
        {...props}
      >
        {sector}
      </span>
    );
  }
);

SectorBadge.displayName = 'SectorBadge';

export default SectorBadge;
