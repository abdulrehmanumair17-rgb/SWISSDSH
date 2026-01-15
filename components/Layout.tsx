
import React from 'react';

const Logo: React.FC = () => (
  <div className="flex items-center gap-3">
    <div className="relative w-10 h-10 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full text-green-700">
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="210 70" strokeLinecap="round" />
        <path d="M35 65 Q 50 75 65 65 Q 65 50 50 50 Q 35 50 35 35 Q 50 25 65 35" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      </svg>
    </div>
    <div className="flex flex-col leading-none">
      <span className="text-2xl font-black tracking-tighter text-slate-800">SWISS</span>
      <span className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.1em]">Pharmaceuticals (Pvt) Ltd</span>
    </div>
  </div>
);

interface LayoutProps {
  children: React.ReactNode;
  currentView: 'dashboard' | 'data-entry';
  onViewChange: (view: 'dashboard' | 'data-entry') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange }) => {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 text-slate-800 flex flex-col hidden md:flex no-print">
        <div className="p-6 border-b border-slate-100 mb-2">
          <Logo />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavItem 
            icon="📊" 
            label="Executive Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => onViewChange('dashboard')}
          />
          <NavItem 
            icon="✏️" 
            label="Manual Data Entry" 
            active={currentView === 'data-entry'} 
            onClick={() => onViewChange('data-entry')}
          />
          <NavItem icon="🔗" label="ERP Sync" />
          <NavItem icon="📱" label="WhatsApp Logs" />
          <NavItem icon="📁" label="Audit Archives" />
          <NavItem icon="⚙️" label="System Config" />
        </nav>
        <div className="p-4 border-t border-slate-100 text-[10px] text-slate-400 font-black uppercase tracking-widest">
          Version 5.0.0 Stable
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10 no-print">
          <div className="flex items-center gap-4">
            <div className="md:hidden">
              <Logo />
            </div>
            <h2 className="text-sm font-black text-slate-800 tracking-widest uppercase hidden md:block">
              {currentView === 'dashboard' ? 'Operations Command' : 'Data Entry Portal'}
            </h2>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-wider">
              {currentView === 'dashboard' ? 'Live Analytics' : 'Input Mode'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Access Level</p>
              <p className="text-xs font-bold text-green-700">Audit Admin</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-700 flex items-center justify-center text-white font-black shadow-lg shadow-green-100">SW</div>
          </div>
        </header>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ icon: string, label: string, active?: boolean, onClick?: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${active ? 'bg-green-50 text-green-700 border border-green-100 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
  >
    <span className="text-lg opacity-80">{icon}</span>
    {label}
  </button>
);
