
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { DataEntry } from './components/DataEntry.tsx';
import { DepartmentMismatch, HolidaysMap, LocksMap } from './types.ts';
import { saveData, getData } from './services/dbService.ts';

const INITIAL_DATA: DepartmentMismatch[] = [
  { department: 'Production', metric: 'System Core Initialization', plan: 100, actual: 100, variance: 0, unit: 'Status', status: 'on-track', reasoning: 'System Ready.' },
];

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'data-entry'>('dashboard');
  const [isReady, setIsReady] = useState(false);
  
  const [operationData, setOperationData] = useState<DepartmentMismatch[]>([]);
  const [holidaysMap, setHolidaysMap] = useState<HolidaysMap>({});
  const [locksMap, setLocksMap] = useState<LocksMap>({});

  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const savedOps = await getData('operationData');
        const savedHols = await getData('holidaysMap');
        const savedLocks = await getData('locksMap');

        if (savedOps && savedOps.length > 0) setOperationData(savedOps);
        else setOperationData(INITIAL_DATA);

        if (savedHols) setHolidaysMap(savedHols);
        if (savedLocks) setLocksMap(savedLocks);
      } catch (e) {
        console.error("IndexedDB Connection Failed:", e);
        setOperationData(INITIAL_DATA);
      } finally {
        setIsReady(true);
      }
    };
    loadPersistedData();
  }, []);

  useEffect(() => {
    if (isReady) saveData('operationData', operationData);
  }, [operationData, isReady]);

  useEffect(() => {
    if (isReady) saveData('holidaysMap', holidaysMap);
  }, [holidaysMap, isReady]);

  useEffect(() => {
    if (isReady) saveData('locksMap', locksMap);
  }, [locksMap, isReady]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Loading Core System...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout currentView={view} onViewChange={setView}>
      {view === 'dashboard' ? (
        <Dashboard 
          data={operationData} 
          onDataUpdate={setOperationData}
          holidaysMap={holidaysMap}
        />
      ) : (
        <DataEntry 
          data={operationData} 
          onDataUpdate={setOperationData} 
          holidaysMap={holidaysMap}
          setHolidaysMap={setHolidaysMap}
          locksMap={locksMap}
          setLocksMap={setLocksMap}
        />
      )}
    </Layout>
  );
};

export default App;
