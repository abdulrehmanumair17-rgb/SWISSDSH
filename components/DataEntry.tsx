
import React, { useState, useMemo, useEffect } from 'react';
import { DepartmentMismatch, HolidaysMap, LocksMap } from '../types.ts';
import * as XLSX from 'xlsx';

interface DataEntryProps {
  data: DepartmentMismatch[];
  onDataUpdate: (data: DepartmentMismatch[]) => void;
  holidaysMap: HolidaysMap;
  setHolidaysMap: React.Dispatch<React.SetStateAction<HolidaysMap>>;
  locksMap: LocksMap;
  setLocksMap: React.Dispatch<React.SetStateAction<LocksMap>>;
}

const SALES_TEAMS = ['ACHIEVERS', 'PASSIONATE', 'CONCORD', 'DYNAMIC'];

export const DataEntry: React.FC<DataEntryProps> = ({ 
  data, 
  onDataUpdate,
  holidaysMap,
  setHolidaysMap,
  locksMap,
  setLocksMap
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'master' | 'daily' | 'territory-master' | 'territory-daily' | 'config'>('daily');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<number[]>([new Date().getDate()]);

  const selectedMonth = viewDate.getMonth();
  const selectedYear = viewDate.getFullYear();
  const monthKey = `${selectedYear}-${selectedMonth}`;
  const monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][selectedMonth];

  const daysInMonth = useMemo(() => new Date(selectedYear, selectedMonth + 1, 0).getDate(), [selectedYear, selectedMonth]);

  useEffect(() => {
    setSelectedDays([1]);
  }, [selectedMonth, selectedYear]);

  const getEffectiveHolidays = (hols: number[] | undefined) => {
    if (hols !== undefined) return hols;
    const sundays: number[] = [];
    const d = new Date(selectedYear, selectedMonth, 1);
    while (d.getMonth() === selectedMonth) {
      if (d.getDay() === 0) sundays.push(d.getDate());
      d.setDate(d.getDate() + 1);
    }
    return sundays;
  };

  const currentHolidays = getEffectiveHolidays(holidaysMap[monthKey]);
  const isLocked = locksMap[monthKey] || false;
  const isHolidaysEditable = isAdminMode || !isLocked;

  const workingDays = useMemo(() => {
    let count = 0;
    const date = new Date(selectedYear, selectedMonth, 1);
    while (date.getMonth() === selectedMonth) {
      const dayNum = date.getDate();
      if (!currentHolidays.includes(dayNum)) count++;
      date.setDate(date.getDate() + 1);
    }
    return count;
  }, [selectedMonth, selectedYear, currentHolidays]);

  const handleMonthChange = (offset: number) => {
    setViewDate(new Date(selectedYear, selectedMonth + offset, 1));
    setUploadError(null);
  };

  const toggleHoliday = (day: number) => {
    if (!isHolidaysEditable) return;
    setHolidaysMap(prev => {
      const existing = getEffectiveHolidays(prev[monthKey]);
      const updated = existing.includes(day) ? existing.filter(d => d !== day) : [...existing, day];
      return { ...prev, [monthKey]: updated };
    });
  };

  const toggleDaySelection = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) ? (prev.length > 1 ? prev.filter(d => d !== day) : prev) : [...prev, day]
    );
  };

  const handleLockMonth = () => {
    if (confirm(`IMPORTANT: Lock ${monthName} ${selectedYear}?`)) {
      setLocksMap(prev => ({ ...prev, [monthKey]: true }));
    }
  };

  const handleUnlockMonth = () => {
    if (confirm(`Admin Override: Unlock ${monthName} ${selectedYear}?`)) {
      setLocksMap(prev => ({ ...prev, [monthKey]: false }));
    }
  };

  const handleAdminToggle = () => {
    if (!isAdminMode) {
      const pin = prompt("Enter Admin Override PIN:");
      if (pin === "786") setIsAdminMode(true);
      else alert("Invalid PIN.");
    } else {
      setIsAdminMode(false);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'master' | 'daily' | 'territory-master' | 'territory-daily') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: false });
        const isTerritory = type.includes('territory');
        const isMaster = type.includes('master');
        const targetDept = isTerritory ? 'Territory Sales' : 'Sales';
        
        const sheetName = wb.SheetNames.find(name => {
           const low = name.toLowerCase();
           if (isTerritory) return low.includes('territory') || low.includes('teritory');
           return low.includes('sales');
        }) || wb.SheetNames[0];
        
        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        
        const masterReportDate = `MASTER_${monthName}_${selectedYear}`;
        const allNewEntries: DepartmentMismatch[] = [];
        const dateColumnMap: Record<number, number> = {};
        
        if (!isMaster) {
          // Robust date column mapping
          for (let r = 0; r < Math.min(rows.length, 10); r++) {
            for (let c = 0; c < 150; c++) {
              let cellVal = String(rows[r][c] || "").trim();
              
              // Handle Excel Serial Dates if any
              if (!isNaN(Number(cellVal)) && cellVal.length > 4 && Number(cellVal) > 40000) {
                 const date = XLSX.SSF.parse_date_code(Number(cellVal));
                 if (date) cellVal = `${date.d}/${date.m}/${date.y}`;
              }

              if (cellVal.includes('/') && (cellVal.split('/').length === 3)) {
                const parts = cellVal.split('/');
                const dayCandidate = parseInt(parts[0]);
                if (!isNaN(dayCandidate)) {
                  dateColumnMap[dayCandidate] = c;
                }
              }
            }
          }
        }

        const targetDays = isMaster ? [0] : selectedDays;

        targetDays.forEach(day => {
          let currentTeam = "";
          let dataColumnIndex = -1;

          if (isMaster) {
            for (let r = 0; r < Math.min(rows.length, 10); r++) {
              for (let c = 0; c < 30; c++) {
                const val = String(rows[r][c] || "").trim().toUpperCase();
                if (val === "TGT" || val === "TARGET" || val === "PLAN") { dataColumnIndex = c; break; }
              }
              if (dataColumnIndex !== -1) break;
            }
          } else {
            dataColumnIndex = dateColumnMap[day] ?? -1;
          }

          if (dataColumnIndex === -1) return;

          const dStr = day < 10 ? '0' + day : day;
          const reportDateStr = isMaster ? masterReportDate : `${monthName} ${dStr}, ${selectedYear}`;

          rows.forEach((row) => {
            const firstColValue = String(row[0] || "").trim();
            if (!firstColValue) return;

            const normalizedFirstCol = firstColValue.toUpperCase();
            const teamFound = SALES_TEAMS.find(t => normalizedFirstCol === t);
            
            if (teamFound) {
              currentTeam = teamFound.charAt(0) + teamFound.slice(1).toLowerCase();
              return;
            }

            if (!currentTeam || normalizedFirstCol === "ROW LABELS" || normalizedFirstCol.includes("TOTAL") || normalizedFirstCol === "ACTUAL") return;

            const rawVal = String(row[dataColumnIndex] || "0").replace(/,/g, "");
            const numericVal = parseFloat(rawVal);

            if (!isNaN(numericVal) && numericVal !== 0) {
              allNewEntries.push({
                department: targetDept, 
                team: currentTeam, 
                metric: firstColValue,
                plan: isMaster ? numericVal : 0, 
                actual: !isMaster ? numericVal : 0,
                variance: 0, 
                unit: 'Units', 
                status: 'on-track',
                reportDate: reportDateStr
              });
            }
          });
        });

        if (allNewEntries.length > 0) {
          const targetDates = Array.from(new Set(allNewEntries.map(e => e.reportDate)));
          const updatedData = [
            ...data.filter(d => !(d.department === targetDept && targetDates.includes(d.reportDate))),
            ...allNewEntries
          ];
          onDataUpdate(updatedData);
          alert(`SUCCESS: Uploaded ${allNewEntries.length} items for ${targetDates.length} selected days.`);
        } else {
          setUploadError(`IMPORT FAILED: Could not find columns for selected days (${selectedDays.join(', ')}) in the Excel file.`);
        }
      } catch (err) { 
        setUploadError("SYSTEM ERROR: Failed to parse Excel file. Check format."); 
      } finally { 
        setIsUploading(false); 
      }
    };
    reader.readAsBinaryString(file);
  };

  const renderMonthSelector = () => (
    <div className="flex flex-col items-center gap-6 mb-10 no-print">
      <div className="flex items-center gap-6">
        <div className="flex gap-2">
          <button onClick={() => handleMonthChange(-1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => handleMonthChange(1)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div className="text-left">
          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Targeting Period</p>
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">{monthName} {selectedYear}</h3>
        </div>
      </div>
      
      {(activeTab === 'territory-daily' || activeTab === 'daily') && (
        <div className="w-full max-w-lg space-y-4">
          <div className="text-center">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Batch Selection (Days)</label>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Select the dates corresponding to your Excel columns</p>
          </div>
          <div className="grid grid-cols-7 gap-2 bg-slate-50 p-4 rounded-3xl border border-slate-100">
             {[...Array(daysInMonth)].map((_, i) => {
               const day = i + 1;
               const isSelected = selectedDays.includes(day);
               return (
                 <button
                  key={day}
                  onClick={() => toggleDaySelection(day)}
                  className={`h-10 rounded-lg text-xs font-black transition-all ${isSelected ? 'bg-red-600 text-white shadow-lg scale-105' : 'bg-white text-slate-400 hover:bg-slate-100'}`}
                 >
                   {day}
                 </button>
               );
             })}
          </div>
          <div className="flex justify-between items-center px-4">
             <button onClick={() => setSelectedDays([...Array(daysInMonth)].map((_, i) => i + 1))} className="text-[9px] font-black text-slate-400 uppercase hover:text-red-600">Select Month</button>
             <button onClick={() => setSelectedDays([1])} className="text-[9px] font-black text-slate-400 uppercase hover:text-red-600">Clear All</button>
          </div>
        </div>
      )}
    </div>
  );

  const renderTab = () => {
    if (activeTab === 'config') {
      const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
      const daysInMonthCurrent = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const daysArray: (number | null)[] = [...Array(firstDay).fill(null)];
      for (let i = 1; i <= daysInMonthCurrent; i++) daysArray.push(i);
      return (
        <div className="space-y-8 animate-in fade-in">
          <div className="flex justify-between items-end">
            <div className="flex gap-4">
              <button onClick={() => handleMonthChange(-1)} className="p-3 bg-slate-100 rounded-xl">◀</button>
              <div><h3 className="text-2xl font-black">{monthName} {selectedYear}</h3><p className="text-[10px] uppercase font-bold text-slate-400">{isLocked ? '🔒 Locked' : 'Select Holidays'}</p></div>
              <button onClick={() => handleMonthChange(1)} className="p-3 bg-slate-100 rounded-xl">▶</button>
            </div>
            <div className="text-right"><p className="text-[10px] font-black text-red-600">WORKING DAYS</p><p className="text-5xl font-black">{workingDays}</p></div>
          </div>
          <div className={`grid grid-cols-7 gap-2 ${isLocked ? 'opacity-50 grayscale border-2 border-green-100 bg-green-50/10 p-4 rounded-3xl' : ''}`}>
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(d => <div key={d} className="text-center text-[9px] font-black text-slate-400">{d}</div>)}
            {daysArray.map((day, idx) => (
              day ? <button key={idx} disabled={!isHolidaysEditable} onClick={() => toggleHoliday(day)} className={`h-14 rounded-xl text-xs font-black border ${currentHolidays.includes(day) ? 'bg-red-600 text-white' : 'bg-white text-slate-700'}`}>{day}</button> : <div key={idx} />
            ))}
          </div>
          <div className="flex justify-center">{isLocked ? (isAdminMode && <button onClick={handleUnlockMonth} className="text-red-600 font-black text-[10px] uppercase">Unlock for Editing</button>) : <button onClick={handleLockMonth} className="bg-green-700 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px]">Lock Month</button>}</div>
        </div>
      );
    }
    
    const isMaster = activeTab.includes('master');
    const isDaily = activeTab === 'daily' || activeTab === 'territory-daily';
    const title = activeTab.replace('-', ' ').toUpperCase();

    return (
      <div className="flex flex-col items-center space-y-8 animate-in fade-in">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-black italic">{title} SYNC</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Swiss Operational Logistics Portal</p>
        </div>
        {renderMonthSelector()}
        <div className="bg-slate-50 border border-slate-200 p-8 rounded-[2.5rem] w-full max-w-md text-center">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 leading-relaxed">
            Scanning <strong>{isDaily ? `${selectedDays.length} specific dates` : `${monthName.toUpperCase()} Master Plan`}</strong>. 
            Ensure your Excel columns match the selected days.
          </p>
          <label className="bg-red-600 text-white px-12 py-6 rounded-3xl font-black uppercase text-[10px] cursor-pointer shadow-xl inline-block hover:scale-105 active:scale-95 transition-all">
            {isUploading ? 'SYNCHRONIZING BATCH...' : 'SELECT EXCEL FILE'}
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleUpload(e, activeTab as any)} disabled={isUploading} />
          </label>
        </div>
        {uploadError && <div className="text-red-600 text-[10px] font-black bg-red-50 p-4 rounded-xl border border-red-100">{uploadError}</div>}
      </div>
    );
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-12 pb-20">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black italic">Swiss Data Pipeline</h2>
        <button onClick={handleAdminToggle} className="text-[10px] font-black uppercase text-slate-400 transition-colors hover:text-slate-900">{isAdminMode ? '🔓 Admin Mode On' : '🔒 Admin Login'}</button>
      </div>
      <div className="bg-white rounded-[4rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-thin">
          {[
            { id: 'daily', label: 'Daily' },
            { id: 'master', label: 'Master' },
            { id: 'territory-daily', label: 'Territory Daily' },
            { id: 'territory-master', label: 'Territory Master' },
            { id: 'config', label: 'Config' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 min-w-[120px] py-8 text-[10px] font-black uppercase transition-all ${activeTab === tab.id ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>{tab.label}</button>
          ))}
        </div>
        <div className="p-16">{renderTab()}</div>
      </div>
    </div>
  );
};
