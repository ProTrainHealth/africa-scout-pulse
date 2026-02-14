export type Company = {
  id: string;
  name: string;
  sector: Sector;
  country: string;
  countryCode: string;
  cashRunway: number; // months
  insiderOwnership: number; // percentage
  scoutScore: number; // 0-100
  nextCatalyst: string;
  catalystDate: string;
  institutionalFlow: 'inflow' | 'outflow' | 'neutral';
  marketCap: string;
  description: string;
};

export type Sector =
  | 'Energy Transition'
  | 'Strategic Resources'
  | 'Life Support'
  | 'Digital Infrastructure'
  | 'Financial Systems'
  | 'Logistics & Trade';

export const SECTORS: Sector[] = [
  'Energy Transition',
  'Strategic Resources',
  'Life Support',
  'Digital Infrastructure',
  'Financial Systems',
  'Logistics & Trade',
];

export const SECTOR_COLORS: Record<Sector, string> = {
  'Energy Transition': 'bg-primary/20 text-primary',
  'Strategic Resources': 'bg-accent/20 text-accent',
  'Life Support': 'bg-score-low/20 text-score-low',
  'Digital Infrastructure': 'bg-blue-500/20 text-blue-400',
  'Financial Systems': 'bg-purple-500/20 text-purple-400',
  'Logistics & Trade': 'bg-orange-500/20 text-orange-400',
};

export const COUNTRIES = [
  'Nigeria', 'South Africa', 'Kenya', 'Egypt', 'Morocco', 'Ghana',
  'Ethiopia', 'Tanzania', 'Rwanda', 'Senegal', 'Côte d\'Ivoire',
  'DRC', 'Mozambique', 'Botswana', 'Namibia',
];
