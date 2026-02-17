
import React from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { School, AppMode } from '../types';

interface SchoolMarkerProps {
  school: School;
  mode: AppMode;
  isSelected: boolean;
  onClick: (school: School) => void;
}

const getMarkerIcon = (isSelected: boolean, isExternal: boolean) => {
  // Brand Colors
  const NAVY = '#002147';
  const GOLD = '#F9A825';
  const INDIGO = '#6366f1';
  
  // Pins: Standard pins are Navy Blue. The selected school pin is Yellow.
  let color = isExternal ? INDIGO : NAVY;
  if (isSelected) color = GOLD;
  
  const scale = isSelected ? '1.4' : '1';
  const className = isSelected ? 'selected-marker-pulse' : '';
  
  const svg = `
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="${className}" style="transform: scale(${scale}); transition: all 0.3s ease;">
      <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="${color}" stroke="white" stroke-width="1.5"/>
    </svg>
  `;
  
  return L.divIcon({
    html: svg,
    className: 'custom-pin',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

export const SchoolMarker: React.FC<SchoolMarkerProps> = ({ school, isSelected, onClick }) => {
  if (!school.latitude || !school.longitude) return null;

  return (
    <Marker 
      position={[school.latitude, school.longitude]}
      icon={getMarkerIcon(isSelected, !!school.isExternal)}
      eventHandlers={{ click: () => onClick(school) }}
    >
      <Tooltip direction="top" offset={[0, -40]} opacity={1} className="!bg-white !border-slate-200 !text-slate-900 !p-3 !rounded-xl !shadow-xl !min-w-[180px] !font-sans">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-[11px] uppercase tracking-tight text-[#002147]">{school.name}</span>
          <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
             <span className="text-[9px] text-slate-500 font-medium">
               {school.isExternal ? 'Global Search Result' : (school.enriched?.address || 'School Record')}
             </span>
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
};
