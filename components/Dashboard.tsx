
import React, { useState, useMemo } from 'react';
import { DepartmentMismatch, HolidaysMap } from '../types.ts';
import { summarizeOperations, SummaryResult } from '../services/geminiService.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';

interface DashboardProps {
  data: DepartmentMismatch[];
  onDataUpdate: (data: DepartmentMismatch[]) => void;
  holidaysMap: HolidaysMap;
}

const PRODUCT_MAPPING: Record<string, string[]> = {
  'Achievers': [
    'Asvon Tab 10/100mg 30s', 'Atoxan 30mg Tab.', 'D-ABS injection (IM)', 
    'D-ABS injection (IM) 5s', 'Pentallin Syp. IVY', 'Oplex 50mg/5ml Syrup 120ml',
    'Roplex 50mg/5ml Syrup 120ml', 'Swicef 100mg/5ml Susp.', 'Swicef DS 200mg/5ml Susp.', 
    'Vitaglobin Plus Syp', 'Vitaglobin Syp.', 'VITAGLOBIN Syrup 120ml', 'Vonz Tab 10mg 30s', 'Vonz Tab 20mg 30s'
  ],
  'Passionate': [
    'Cyestra Tablet', 'Ferriboxy Injection 500mg / 10ml', 'LER 2.5mg Tablet', 
    'Neet', 'Nomo-D 10/10mg Tablet', 'Oplex F 100mg/0.35mg 30s Tab',
    'Roplex F 100mg/0.35mg 30s Tab', 'Swicef 400mg Cap.', 'Vitaglobin Tablets'
  ],
  'Concord': ['Gaviscon Liquid', 'Panadol 500mg', 'Brufen 400mg', 'Augmentin 625mg'],
  'Dynamic': ['Solu-Cortef 100mg', 'Voren Inj', 'Dicloran Gel', 'Xylocaine 2%']
};

const TERRITORY_MAPPING: Record<string, string[]> = {
  'Achievers': ['Lahore North', 'Lahore South', 'Karachi East', 'Karachi West'],
  'Passionate': [
    'ABT1', 'BWP1', 'BNU1', 'LRK1', 'SGD1', 'DGK1', 'FSD1', 'HYD1', 'JCB1', 'KHI1', 'KHI2', 'KHI3', 'LHR1', 'LHR2', 'MUL1', 'PEW1', 'RWP1', 'SKR1'
  ],
  'Concord': ['Faisalabad', 'Multan', 'Sialkot', 'Gujranwala'],
  'Dynamic': ['Hyderabad', 'Sukkur', 'Bahawalpur', 'Sargodha']
};

const TEAM_COLORS: Record<string, string> = {
  'Achievers': '#3b82f6',
  'Passionate': '#ef4444',
  'Concord': '#10b981',
  'Dynamic': '#f59e0b'
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const Dashboard: React.FC<DashboardProps> = ({ data, holidaysMap }) => {
  const [report, setReport] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSheet, setActiveSheet] = useState<string>('Executive Summary');
  const [auditView, setAuditView] = useState<'divisions' | 'trend'>('divisions');
  const [auditDimension, setAuditDimension] = useState<'product' | 'territory'>('product');
  
  const [viewDate, setViewDate] = useState(new Date());
  const selectedMonth = viewDate.getMonth();
  const selectedYear = viewDate.getFullYear();
  const monthKey = `${selectedYear}-${selectedMonth}`;
  const currentMonthName = MONTH_NAMES[selectedMonth];
  
  const [focusedDate, setFocusedDate] = useState<number | null>(null);

  const isLastDay = (year: number, month: number, day: number) => {
    const nextDay = new Date(year, month, day + 1);
    return nextDay.getMonth() !== month;
  };

  const isLastDayOfMonth = useMemo(() => {
    if (!focusedDate) return false;
    return isLastDay(selectedYear, selectedMonth, focusedDate);
  }, [focusedDate, selectedMonth, selectedYear]);

  const getDailyTarget = (totalPlan: number, day: number, month: number, year: number, workingDays: number) => {
    const isClosingDay = isLastDay(year, month, day);
    const weightOfLastDay = 3.5; 
    const totalWeights = (workingDays - 1) + weightOfLastDay;
    
    if (isClosingDay) {
      return Math.round((totalPlan / totalWeights) * weightOfLastDay);
    }
    return Math.round(totalPlan / totalWeights);
  };

  const handleMonthChange = (offset: number) => {
    setViewDate(new Date(selectedYear, selectedMonth + offset, 1));
    setFocusedDate(null);
    setAuditView('divisions');
  };

  const workingDaysCount = useMemo(() => {
    let hols = holidaysMap[monthKey];
    if (!hols) {
      hols = [];
      const d = new Date(selectedYear, selectedMonth, 1);
      while (d.getMonth() === selectedMonth) {
        if (d.getDay() === 0) hols.push(d.getDate());
        d.setDate(d.getDate() + 1);
      }
    }

    let count = 0;
    const date = new Date(selectedYear, selectedMonth, 1);
    while (date.getMonth() === selectedMonth) {
      const dayNum = date.getDate();
      const isHoliday = hols.includes(dayNum);
      if (!isHoliday) count++;
      date.setDate(date.getDate() + 1);
    }
    return count || 26;
  }, [selectedMonth, selectedYear, holidaysMap, monthKey]);

  const renderDepartmentView = (dept: string, mapping: Record<string, string[]>) => {
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const daysArray: (number | null)[] = [...Array(firstDay).fill(null)];
    for (let i = 1; i <= daysInMonth; i++) daysArray.push(i);

    let monthHolidays = holidaysMap[monthKey];
    if (!monthHolidays) {
      monthHolidays = [];
      const d = new Date(selectedYear, selectedMonth, 1);
      while (d.getMonth() === selectedMonth) {
        if (d.getDay() === 0) monthHolidays.push(d.getDate());
        d.setDate(d.getDate() + 1);
      }
    }

    const currentMapping = activeSheet === 'Sales' ? PRODUCT_MAPPING : TERRITORY_MAPPING;
    const currentDept = activeSheet === 'Sales' ? 'Sales' : 'Territory Sales';

    const groupPerformanceDataForDate = (day: number) => {
      const dStr = day < 10 ? '0' + day : day;
      const dayPattern = `${MONTH_NAMES[selectedMonth]} ${dStr}, ${selectedYear}`;
      const masterMonthPattern = `MASTER_${MONTH_NAMES[selectedMonth]}_${selectedYear}`;

      return Object.keys(currentMapping).map(team => {
        let totalTarget = 0;
        let totalAchieved = 0;

        const teamMasterRows = data.filter(d => 
          d.department === currentDept && 
          d.team === team && 
          d.plan > 0 && 
          d.reportDate === masterMonthPattern
        );

        teamMasterRows.forEach(r => {
          const dailyTarget = getDailyTarget(r.plan, day, selectedMonth, selectedYear, workingDaysCount);
          const dailyMatch = data.find(d => d.department === currentDept && d.metric === r.metric && d.reportDate?.toLowerCase().includes(dayPattern.toLowerCase()));
          const achieved = dailyMatch ? dailyMatch.actual : 0;
          totalTarget += dailyTarget;
          totalAchieved += achieved;
        });

        return { name: team, Target: totalTarget, Achieved: totalAchieved };
      });
    };

    const getMonthlyTrend = () => {
      const trend = [];
      const masterMonthPattern = `MASTER_${MONTH_NAMES[selectedMonth]}_${selectedYear}`;
      const totalMonthlyTarget = data
        .filter(d => d.department === currentDept && d.plan > 0 && d.reportDate === masterMonthPattern)
        .reduce((sum, item) => sum + item.plan, 0);

      for (let day = 1; day <= daysInMonth; day++) {
        const dStr = day < 10 ? '0' + day : '' + day;
        const dayPattern = `${MONTH_NAMES[selectedMonth]} ${dStr}, ${selectedYear}`;
        const dayHolidays = holidaysMap[monthKey] || [];
        const isHoliday = dayHolidays.includes(day);
        const dailyTarget = isHoliday ? 0 : getDailyTarget(totalMonthlyTarget, day, selectedMonth, selectedYear, workingDaysCount);

        const teamData: Record<string, number> = {};
        Object.keys(currentMapping).forEach(team => {
          teamData[team] = data
            .filter(d => d.department === currentDept && d.team === team && d.reportDate?.toLowerCase().includes(dayPattern.toLowerCase()))
            .reduce((sum, item) => sum + item.actual, 0);
        });

        trend.push({
          day: day,
          Target: dailyTarget,
          TotalAchievement: Object.values(teamData).reduce((a, b) => a + b, 0),
          ...teamData,
          isHoliday
        });
      }
      return trend;
    };

    return (
      <div className="bg-white">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <div className="flex items-center gap-6">
            <div className="flex gap-2 no-print">
              <button onClick={() => handleMonthChange(-1)} className="w-10 h-10 rounded-xl bg-slate-200/50 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={() => handleMonthChange(1)} className="w-10 h-10 rounded-xl bg-slate-200/50 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">{MONTH_NAMES[selectedMonth]} {selectedYear}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{currentDept} Pulse • Weighted Target Analysis ({workingDaysCount} Days)</p>
            </div>
          </div>
        </div>

        <div className="p-10">
          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(d => (
              <div key={d} className="bg-slate-50 py-4 text-center text-[10px] font-black text-slate-400 tracking-widest">{d}</div>
            ))}
            {daysArray.map((day, idx) => {
              const isSunday = day && new Date(selectedYear, selectedMonth, day).getDay() === 0;
              const isHoliday = day && monthHolidays.includes(day);
              const dStr = day ? (day < 10 ? '0' + day : '' + day) : '';
              const dayPattern = day ? `${MONTH_NAMES[selectedMonth]} ${dStr}, ${selectedYear}` : '';
              const hasData = day && data.some(d => d.department === currentDept && d.reportDate && d.reportDate.toLowerCase().includes(dayPattern.toLowerCase()));

              return (
                <button
                  key={idx}
                  disabled={!day}
                  onClick={() => { setFocusedDate(day); setAuditView('divisions'); }}
                  className={`h-32 p-4 text-left relative transition-all ${!day ? 'bg-slate-50/50' : isHoliday ? 'bg-red-50/80 text-red-600' : 'bg-white hover:bg-slate-50 hover:shadow-inner'} ${focusedDate === day ? 'ring-4 ring-inset ring-red-600 z-10' : ''}`}
                >
                  <span className={`text-sm font-black ${isHoliday ? 'text-red-600' : 'text-slate-800'}`}>{day || ''}</span>
                  {isHoliday && <span className="block text-[8px] font-bold text-red-400 uppercase tracking-tighter mt-1">{isSunday ? 'OFF (SUN)' : 'HOLIDAY'}</span>}
                  {hasData && !isHoliday && (
                    <div className="absolute bottom-4 left-4 right-4 flex items-center gap-1.5">
                       <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-200 animate-pulse"></div>
                       <span className="text-[9px] font-black text-green-600 uppercase tracking-tighter">DATA SYNCED</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {focusedDate && (
          <div className="px-10 pb-20 animate-in fade-in slide-in-from-bottom-5">
            <div className="bg-[#0b1120] rounded-[3rem] overflow-hidden shadow-4xl border border-white/5">
              <div className="p-10 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-xl shadow-xl">📊</div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{currentDept} SHORTFALL AUDIT - {MONTH_NAMES[selectedMonth]} {focusedDate}, {selectedYear}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PERFORMANCE MATRIX: DAILY WEIGHTED TARGET</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 no-print">
                    <button 
                      onClick={() => setAuditView('divisions')} 
                      className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${auditView === 'divisions' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                      Divisions
                    </button>
                    {isLastDayOfMonth && (
                      <button 
                        onClick={() => setAuditView('trend')} 
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${auditView === 'trend' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                      >
                        Monthly Trend
                      </button>
                    )}
                  </div>
                  <button onClick={() => setFocusedDate(null)} className="text-white/40 hover:text-white text-xs font-black uppercase tracking-widest px-6 py-3 border border-white/10 rounded-xl transition-all hover:bg-white/5 shadow-xl">EXIT REPORT</button>
                </div>
              </div>

              {auditView === 'divisions' ? (
                <>
                  <div className="p-10 bg-slate-900/40 border-b border-white/5">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8">Aggregate Divisional Performance</h4>
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={groupPerformanceDataForDate(focusedDate)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="name" stroke="#475569" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                          <YAxis stroke="#475569" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '11px', fontWeight: 'bold' }} itemStyle={{ color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                          <Legend wrapperStyle={{ paddingTop: '25px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                          <Bar dataKey="Target" name="TREND TARGET" fill="#1e293b" radius={[6, 6, 0, 0]} barSize={45} />
                          <Bar dataKey="Achieved" name="DAILY ACTUAL" fill="#dc2626" radius={[6, 6, 0, 0]} barSize={45} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="max-h-[600px] overflow-auto scrollbar-thin">
                    {(() => {
                      const dStr = focusedDate < 10 ? '0' + focusedDate : focusedDate;
                      const dayPattern = `${MONTH_NAMES[selectedMonth]} ${dStr}, ${selectedYear}`;
                      const masterMonthPattern = `MASTER_${MONTH_NAMES[selectedMonth]}_${selectedYear}`;
                      const hasDailyReport = data.some(d => d.department === currentDept && d.reportDate && d.reportDate.toLowerCase().includes(dayPattern.toLowerCase()));

                      if (!hasDailyReport) {
                        return (
                          <div className="p-32 text-center bg-slate-900/40">
                            <div className="w-20 h-20 bg-amber-900/20 text-amber-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner animate-pulse">📅</div>
                            <h4 className="text-xl font-black text-amber-500 uppercase italic tracking-tight">Daily Achievement is Not Available</h4>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-4 max-w-sm mx-auto leading-relaxed">No synchronization record was found for {dayPattern}. Please upload the daily achievement file.</p>
                          </div>
                        );
                      }

                      return Object.keys(currentMapping).map(team => {
                        const masterRows = data.filter(d => 
                          d.department === currentDept && 
                          d.team === team && 
                          d.plan > 0 && 
                          d.reportDate === masterMonthPattern
                        );
                        
                        if (masterRows.length === 0) {
                          return (
                            <div key={team} className="p-10 border-b border-white/5 bg-slate-900/20">
                              <h4 className="text-white font-black uppercase mb-4 flex items-center gap-4 tracking-tighter italic opacity-50">
                                <span className="w-2 h-8 bg-slate-700 rounded-full"></span> {team} - PLAN STATUS
                              </h4>
                              <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center bg-amber-900/10">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-1">⚠️ MASTER PLAN NOT FOUND ({MONTH_NAMES[selectedMonth]} {selectedYear})</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase">This division requires an Excel Master Plan sync for this specific month to track daily weighted targets.</p>
                              </div>
                            </div>
                          );
                        }

                        const shortfallRows = masterRows.filter(r => {
                          const dailyMatch = data.find(d => d.department === currentDept && d.metric === r.metric && d.reportDate?.toLowerCase().includes(dayPattern.toLowerCase()));
                          const achieved = dailyMatch ? dailyMatch.actual : 0;
                          const dailyTarget = getDailyTarget(r.plan, focusedDate, selectedMonth, selectedYear, workingDaysCount);
                          return (dailyTarget - achieved) > 0;
                        });

                        if (shortfallRows.length === 0) return null;

                        return (
                          <div key={team} className="p-10 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                            <h4 className="text-white font-black uppercase mb-8 flex items-center gap-4 tracking-tighter italic">
                              <span className="w-2 h-8 bg-red-600 rounded-full shadow-lg shadow-red-900"></span> {team} {isLastDayOfMonth ? 'FINAL DAY' : ''} SHORTFALL LIST
                            </h4>
                            <table className="w-full text-left border-collapse">
                              <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10">
                                <tr><th className="pb-6 px-4">{currentDept === 'Sales' ? 'PRODUCT NAME' : 'TERRITORY NAME'}</th><th className="pb-6 px-4 text-right">TREND TARGET</th><th className="pb-6 px-4 text-right">ACHIEVED</th><th className="pb-6 px-4 text-right">GAP</th></tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {shortfallRows.map((r, i) => {
                                  const dailyTarget = getDailyTarget(r.plan, focusedDate, selectedMonth, selectedYear, workingDaysCount);
                                  const dailyMatch = data.find(d => d.department === currentDept && d.metric === r.metric && d.reportDate?.toLowerCase().includes(dayPattern.toLowerCase()));
                                  const achieved = dailyMatch ? dailyMatch.actual : 0;
                                  const shortfall = dailyTarget - achieved;
                                  return (
                                    <tr key={i} className={`group ${shortfall > 50 ? 'bg-red-900/60 border-l-4 border-red-600' : shortfall > 10 ? 'bg-amber-900/40 border-l-4 border-amber-600' : ''} transition-all`}>
                                      <td className="py-6 px-4 text-sm text-slate-300 font-bold group-hover:text-white transition-colors">{r.metric}</td>
                                      <td className="py-6 px-4 text-right text-slate-500 font-mono text-xs">{dailyTarget.toLocaleString()}</td>
                                      <td className="py-6 px-4 text-right font-mono font-black text-lg text-white/40">{achieved.toLocaleString()}</td>
                                      <td className="py-6 px-4 text-right font-mono font-black text-xl text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.4)]">-{shortfall.toLocaleString()}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </>
              ) : (
                <div className="p-10 animate-in fade-in slide-in-from-right-4">
                  <div className="mb-12 flex justify-between items-end">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Multi-Team Achievement Trajectory</h4>
                      <p className="text-white font-black uppercase italic text-2xl tracking-tighter">Divisional Closing Trends</p>
                    </div>
                    <div className="flex gap-4">
                      {Object.entries(TEAM_COLORS).map(([team, color]) => (
                        <div key={team} className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{team}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-[450px] w-full bg-slate-900/50 p-8 rounded-[2rem] border border-white/5 mb-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getMonthlyTrend()} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="day" stroke="#475569" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} label={{ value: 'DAY OF MONTH', position: 'bottom', offset: 0, fill: '#475569', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em' }} />
                        <YAxis stroke="#475569" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '11px', fontWeight: 'bold' }} itemStyle={{ color: '#fff' }} />
                        <Legend wrapperStyle={{ paddingTop: '30px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                        <ReferenceLine y={0} stroke="#1e293b" />
                        <Line type="monotone" dataKey="Target" name="AGGREGATE TARGET" stroke="#1e293b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                        {Object.keys(currentMapping).map(team => (
                           <Line key={team} type="monotone" dataKey={team} name={`${team.toUpperCase()} ACTUAL`} stroke={TEAM_COLORS[team]} strokeWidth={3} dot={{ r: 3, fill: TEAM_COLORS[team], strokeWidth: 1, stroke: '#0b1120' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                        ))}
                        <Line type="monotone" dataKey="TotalAchievement" name="TOTAL GROUP SALES" stroke="#ffffff" strokeWidth={4} strokeDasharray="3 3" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem]"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Master Target</p><p className="text-3xl font-black text-white italic tracking-tighter">{getMonthlyTrend().reduce((sum, d) => sum + d.Target, 0).toLocaleString()}</p></div>
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem]"><p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">Total Realized</p><p className="text-3xl font-black text-white italic tracking-tighter">{getMonthlyTrend().reduce((sum, d) => sum + d.TotalAchievement, 0).toLocaleString()}</p></div>
                    <div className="bg-red-600 p-8 rounded-[2rem] shadow-xl shadow-red-900/20"><p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-4">Final Yield %</p><p className="text-4xl font-black text-white italic tracking-tighter">{(() => { const t = getMonthlyTrend().reduce((sum, d) => sum + d.Target, 0); const a = getMonthlyTrend().reduce((sum, d) => sum + d.TotalAchievement, 0); return t > 0 ? ((a / t) * 100).toFixed(1) : "0.0"; })()}%</p></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSheetContent = () => {
    switch (activeSheet) {
      case 'Executive Summary':
        return (
          <div className="py-20 text-center px-6 md:px-10 flex flex-col items-center">
            <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[2.5rem] flex items-center justify-center text-5xl mb-8 shadow-inner animate-float">🤖</div>
            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Swiss Intelligence Audit</h3>
            <p className="text-slate-400 font-medium max-w-sm mt-2 mb-10 uppercase text-[10px] tracking-widest font-bold">Comprehensive analysis optimized for 5-minute board reading.</p>
            <button disabled={loading} onClick={async () => { setLoading(true); try { setReport(await summarizeOperations(data)); } finally { setLoading(false); } }} className="bg-red-600 text-white px-12 md:px-20 py-6 md:py-8 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-3xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'ANALYZING LARGE DATASET...' : 'GENERATE BOARD REPORT'}
            </button>
            {report && (
              <div className="mt-16 text-left max-w-4xl w-full mx-auto p-8 md:p-14 bg-slate-900 rounded-[3rem] text-white shadow-4xl border border-white/5 animate-in zoom-in-95">
                <div className="flex justify-between items-start mb-10 border-b border-white/10 pb-8">
                  <div><h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] mb-2">Executive Overview</h4><p className="text-xl md:text-2xl font-bold italic leading-relaxed text-slate-100">"{report.executiveSummary}"</p></div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shrink-0 hidden sm:block"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Reading Time</p><p className="text-xl font-black text-white text-center">~{report.readingTimeMinutes} MIN</p></div>
                </div>
                <div className="grid lg:grid-cols-5 gap-12">
                  <div className="lg:col-span-3 space-y-6"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-red-600 pl-4">Strategic Detailed Analysis:</p><div className="text-sm md:text-base text-slate-300 leading-relaxed space-y-4 prose prose-invert max-w-none">{report.detailedAnalysis.split('\n').map((para, i) => para.trim() ? <p key={i}>{para}</p> : null)}</div></div>
                  <div className="lg:col-span-2 space-y-8"><div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-l-2 border-red-600 pl-4">Priority Board Actions:</p><div className="space-y-4">{report.actions.map((a, i) => ( <div key={i} className="flex gap-4 items-start bg-white/5 p-5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors"><span className="w-8 h-8 rounded-xl bg-red-600 text-[10px] flex shrink-0 items-center justify-center font-black shadow-lg shadow-red-900/40">{i+1}</span><span className="text-xs font-bold uppercase tracking-tight text-slate-200 pt-1.5">{a}</span></div> ))}</div></div><div className="bg-red-600/10 border border-red-600/20 p-6 rounded-[2rem]"><p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Audit Compliance</p><p className="text-[11px] text-slate-400 font-medium italic">This summary was generated by analyzing {data.filter(d => d.department === 'Sales').length} sales line-items.</p></div></div>
                </div>
              </div>
            )}
          </div>
        );
      case 'Sales':
        return renderDepartmentView('Sales', PRODUCT_MAPPING);
      case 'Territory Sales':
        return renderDepartmentView('Territory Sales', TERRITORY_MAPPING);
      default:
        return <div className="p-32 text-center text-slate-300 font-black uppercase italic tracking-[0.4em]">Section under board review</div>;
    }
  };

  const sheets = ['Executive Summary', 'Sales', 'Territory Sales', 'Production', 'Finance'];

  return (
    <div className="bg-white rounded-[4rem] border border-slate-200 shadow-3xl overflow-hidden flex flex-col min-h-[900px]">
      <div className="flex-1 overflow-auto">{loading ? <div className="p-40 text-center animate-pulse font-black uppercase text-slate-300 tracking-[0.5em]">Consulting Intelligence Engine...</div> : renderSheetContent()}</div>
      <div className="bg-slate-50 border-t border-slate-200 flex items-center h-28 no-print px-4">
        {sheets.map((sheet) => (
          <button key={sheet} onClick={() => setActiveSheet(sheet)} className={`flex-1 text-[10px] font-black uppercase tracking-[0.3em] h-20 rounded-2xl transition-all mx-1 ${activeSheet === sheet ? 'bg-white text-red-700 shadow-xl border border-slate-200' : 'text-slate-400 hover:bg-slate-100'}`}>{sheet}</button>
        ))}
      </div>
    </div>
  );
};
