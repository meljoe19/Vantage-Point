
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { School, AppMode, MapPosition, SchoolStatus } from './types';
import { MAP_STYLES, ATTRIBUTIONS } from './constants';
import { SchoolMarker } from './components/SchoolMarker';
import { IntelligencePanel } from './components/IntelligencePanel';
import { fetchSpreadsheetData, searchExternalSchools } from './services/geminiService';

const SPREADSHEET_ID = '18elJAW846o19QIIlP-exJddWaqkoBVWBPV7S9Knq17s';

// USA Geographic Center
const USA_CENTER: [number, number] = [37.0902, -95.7129];
const INITIAL_ZOOM = 4;

const MapController: React.FC<{ 
  filterState: string; 
  schools: School[];
  selectedSchool: School | null;
}> = ({ filterState, schools, selectedSchool }) => {
  const map = useMap();
  const prevFilterState = useRef(filterState);

  // Dynamic Centering: Smooth neighborhood zoom (Level 12) when a school is selected
  useEffect(() => {
    if (selectedSchool && selectedSchool.latitude !== undefined && selectedSchool.longitude !== undefined) {
      map.flyTo([selectedSchool.latitude, selectedSchool.longitude], 12, {
        animate: true,
        duration: 1.5
      });
    }
  }, [selectedSchool, map]);

  // Handle fitting bounds when state filter changes or resetting to USA center
  useEffect(() => {
    if (filterState !== prevFilterState.current) {
      if (filterState !== 'All States') {
        const stateSchools = schools.filter(s => s.state === filterState && s.latitude !== undefined && s.longitude !== undefined);
        if (stateSchools.length > 0) {
          const bounds = L.latLngBounds(stateSchools.map(s => [s.latitude!, s.longitude!]));
          map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
        }
      } else {
        // Reset to all pins view if possible, otherwise USA center
        const validSchools = schools.filter(s => s.latitude !== undefined && s.longitude !== undefined);
        if (validSchools.length > 0) {
          const bounds = L.latLngBounds(validSchools.map(s => [s.latitude!, s.longitude!]));
          map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
        } else {
          map.flyTo(USA_CENTER, INITIAL_ZOOM);
        }
      }
      prevFilterState.current = filterState;
    }
  }, [filterState, schools, map]);

  return null;
};

const App: React.FC = () => {
  const [managedSchools, setManagedSchools] = useState<School[]>([]);
  const [externalSchools, setExternalSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.INTERNAL);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearchActive, setGlobalSearchActive] = useState(false);
  
  const [filterState, setFilterState] = useState('All States');
  const [filterStatus, setFilterStatus] = useState('All Statuses');
  
  const [showSidebar, setShowSidebar] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  
  const initializationStarted = useRef(false);

  useEffect(() => {
    if (initializationStarted.current) return;
    initializationStarted.current = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchSpreadsheetData(SPREADSHEET_ID);
        setManagedSchools(data);
      } catch (err) {
        console.error("Initialization failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleUpdateSchool = (updatedSchool: School) => {
    if (updatedSchool.isExternal) {
      setExternalSchools(prev => prev.map(s => s.id === updatedSchool.id ? updatedSchool : s));
    } else {
      setManagedSchools(prev => prev.map(s => s.id === updatedSchool.id ? updatedSchool : s));
    }
    setSelectedSchool(updatedSchool);
  };

  const showToastMessage = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddToManaged = (school: School) => {
    const newSchool = { ...school, isExternal: false, id: `managed-${Date.now()}` };
    setManagedSchools(prev => [newSchool, ...prev]);
    setExternalSchools(prev => prev.filter(s => s.id !== school.id));
    setSelectedSchool(newSchool);
    showToastMessage(`${school.name} added to managed CRM list.`);
  };

  const handleGlobalSearch = async () => {
    if (!searchQuery.trim()) return;
    setGlobalSearchActive(true);
    try {
      const results = await searchExternalSchools(searchQuery);
      setExternalSchools(results);
    } catch (error) {
      console.error("Global search error", error);
    } finally {
      setGlobalSearchActive(false);
    }
  };

  const states = useMemo(() => {
    const s = new Set(managedSchools.map(sch => sch.state).filter(Boolean));
    return ['All States', ...Array.from(s).sort()];
  }, [managedSchools]);

  const filteredSchools = useMemo(() => {
    return managedSchools.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesState = filterState === 'All States' || s.state === filterState;
      return matchesSearch && matchesState;
    });
  }, [managedSchools, searchQuery, filterState]);

  const allMarkers = useMemo(() => {
    return [
      ...managedSchools.filter(s => s.latitude !== undefined && s.longitude !== undefined),
      ...externalSchools.filter(s => s.latitude !== undefined && s.longitude !== undefined)
    ];
  }, [managedSchools, externalSchools]);

  return (
    <div className="flex h-screen w-full relative overflow-hidden bg-[#f8fafc] text-slate-900 selection:bg-[#F9A825]/20 font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-[1002] px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#002147] rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-[#002147] uppercase italic leading-none">
              Vantage <span className="text-[#F9A825]">Point</span>
            </h1>
            <p className="text-[9px] font-extrabold text-slate-400 tracking-[0.2em] mt-1 uppercase">
              By School Success
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-xl mx-8 relative flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Filter list by school name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002147]/10 transition-all placeholder-slate-400 text-sm font-medium"
            />
            <svg className="w-5 h-5 absolute left-3.5 top-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <button 
            onClick={handleGlobalSearch}
            disabled={globalSearchActive}
            className="px-6 bg-[#002147] hover:bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 border border-slate-900"
          >
            {globalSearchActive ? "..." : "Global Search"}
          </button>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setMode(AppMode.INTERNAL)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${mode === AppMode.INTERNAL ? 'bg-white text-[#002147] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>INTERNAL</button>
              <button onClick={() => setMode(AppMode.PUBLIC)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${mode === AppMode.PUBLIC ? 'bg-white text-[#002147] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>PUBLIC</button>
            </div>
        </div>
      </header>

      <main className="flex-1 relative mt-16">
        <MapContainer 
          center={USA_CENTER} 
          zoom={INITIAL_ZOOM} 
          className="h-full w-full z-0"
          zoomControl={false}
        >
          {/* Vibrant/Standard Map Style */}
          <TileLayer attribution={ATTRIBUTIONS.VIBRANT} url={MAP_STYLES.VIBRANT} />
          <MapController 
            filterState={filterState} 
            schools={managedSchools} 
            selectedSchool={selectedSchool}
          />
          {allMarkers.map(school => (
            <SchoolMarker 
              key={school.id} 
              school={school} 
              mode={mode} 
              isSelected={selectedSchool?.id === school.id}
              onClick={(s) => setSelectedSchool(s)} 
            />
          ))}
        </MapContainer>

        {/* Sidebar */}
        <aside className={`absolute left-6 top-6 bottom-6 w-80 bg-white border border-slate-200 rounded-3xl shadow-xl z-[1000] flex flex-col transition-all duration-700 ease-in-out transform ${showSidebar ? 'translate-x-0 opacity-100' : '-translate-x-[calc(100%+4rem)] opacity-0'}`}>
          <div className="p-6 border-b border-slate-100 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-black text-[#002147] uppercase italic leading-tight">School Success</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#F9A825]">Strategist Terminal</p>
              </div>
              <button onClick={() => setShowSidebar(false)} className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <select value={filterState} onChange={(e) => setFilterState(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold p-2.5 rounded-xl focus:ring-1 focus:ring-[#002147] outline-none">
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-[#002147] rounded-full animate-spin"></div>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Loading Records...</p>
              </div>
            )}
            {!isLoading && filteredSchools.length === 0 && (
              <div className="text-center py-20 text-slate-400 text-xs font-medium">No schools found matching filters.</div>
            )}
            {!isLoading && filteredSchools.map(school => (
              <button 
                key={school.id}
                onClick={() => setSelectedSchool(school)}
                className={`w-full text-left p-4 rounded-2xl transition-all border ${selectedSchool?.id === school.id ? 'bg-[#002147]/5 border-[#002147]/30 shadow-md ring-1 ring-[#002147]/10' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
              >
                <h3 className="font-bold text-[#002147] text-sm uppercase tracking-tight truncate">{school.name}</h3>
                <p className="text-[10px] text-slate-400 font-medium truncate italic">{school.state || 'National'}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[8px] font-black text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">{school.status}</span>
                  {school.successTracker && <span className="text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">CRM SENT</span>}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {!showSidebar && (
          <button onClick={() => setShowSidebar(true)} className="absolute left-8 top-8 w-12 h-12 bg-white border border-slate-200 rounded-2xl shadow-xl z-[1000] flex items-center justify-center text-[#002147] hover:text-[#F9A825] transition-all group">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </main>

      <IntelligencePanel 
        school={selectedSchool} 
        mode={mode} 
        onClose={() => setSelectedSchool(null)}
        onUpdateSchool={handleUpdateSchool}
        onAddToManaged={handleAddToManaged}
        onNotify={showToastMessage}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#002147] text-white px-8 py-4 rounded-2xl shadow-2xl z-[3000] animate-in slide-in-from-bottom-6 duration-300 flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-[#F9A825] animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">{toast}</span>
        </div>
      )}
    </div>
  );
};

export default App;
