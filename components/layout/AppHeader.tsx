
import React from 'react';
import { Globe, Settings, LogOut } from 'lucide-react';
import { Currency } from '@/types';

interface AppHeaderProps {
  activeTab: string;
  isOnline: boolean;
  currency: Currency;
  onOpenSettings: () => void;
  onLogout: () => void;
}

const TAB_LABELS: Record<string, string> = {
  'DASHBOARD': 'Panel de Control',
  'POS': 'Punto de Venta',
  'INVENTORY': 'Inventario',
  'REPORTS': 'Reportes',
  'CUSTOMERS': 'Pacientes',
  'SUPPLIERS': 'Proveedores',
  'STAFF': 'Personal',
  'SETTINGS': 'Configuración'
};

const AppHeader: React.FC<AppHeaderProps> = ({ activeTab, isOnline, currency, onOpenSettings, onLogout }) => {
  const displayTab = TAB_LABELS[activeTab] || activeTab;

  return (
    <header className="h-16 md:h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 md:px-10 shrink-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-5 md:h-6 bg-emerald-500 rounded-full" />
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">FarmaSalud AI</span>
          <h2 className="text-sm md:text-base font-bold text-slate-800 tracking-tight">{displayTab}</h2>
        </div>
      </div>
      <div className="flex items-center gap-3 md:gap-6">
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${isOnline ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
           <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
           <span className={`text-[9px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
             {isOnline ? 'Online' : 'Modo Offline'}
           </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
           <Globe className="w-3.5 h-3.5 text-emerald-600" />
           <span className="text-[10px] font-black text-emerald-700 uppercase">{currency.code} ({currency.symbol})</span>
        </div>
        <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <button onClick={onLogout} className="md:hidden p-2 text-rose-400">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
