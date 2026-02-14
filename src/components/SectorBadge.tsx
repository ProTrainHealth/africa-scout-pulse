import { Sector, SECTOR_COLORS } from '@/lib/types';

const SectorBadge = ({ sector }: { sector: Sector }) => {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SECTOR_COLORS[sector]}`}>
      {sector}
    </span>
  );
};

export default SectorBadge;
