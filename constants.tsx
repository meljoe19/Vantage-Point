
import { SchoolStatus, School } from './types';

export const INITIAL_SCHOOLS: School[] = [
  {
    id: '1',
    name: 'Northwood Academy',
    strategicNotes: 'High potential for Success Maker program. Needs focus on digital lead gen.',
    status: SchoolStatus.PROSPECT,
    successMakerStatus: 'Vetting Phase',
    enrollmentGoals: 'Increase 9th grade intake by 15%',
    marketingProgress: 'Audit completed',
    campaignStatus: 'Drafting Search Strategy',
    enriched: {
      address: '123 Forest Ln, Seattle, WA 98101',
      lat: 47.6062,
      lng: -122.3321,
      website: 'https://northwoodacademy.edu',
      rating: 4.8,
      phone: '(206) 555-0123'
    }
  }
];

export const MAP_STYLES = {
  VIBRANT: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  TOPOGRAPHIC: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
};

export const ATTRIBUTIONS = {
  VIBRANT: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  DARK: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
};
