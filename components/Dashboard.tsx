
import React from 'react';
import { TrendingUp, AlertTriangle, Calendar, Package } from 'lucide-react';
import { Medication } from '@/types';

interface DashboardProps {
  medications: Medication[];
  currencySymbol: string;
}

const Dashboard: React.FC<DashboardProps> = ({ medications, currencySymbol }) => {
  const lowStock = medications.filter(m => m.stockBoxes <= m.minStock);
  const expiringSoon = medications.filter(m => {
    if (!m.batches[0]?.expiryDate) return false;
    const expiry = new Date(m.batches[0].expiryDate);
    if (isNaN(expiry.getTime())) return false;
    const diff = expiry.getTime() - new Date().getTime();
    return diff > 0 && diff < (90 * 24 * 60 * 60 * 1000);
  });

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Panel de Control</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">FarmaPOS - Tiempo Real</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="Ventas Hoy" value={`${currencySymbol}45.2k`} trend="+12%" icon={<TrendingUp />} color="emerald" />
        <StatCard title="Tickets" value="124" trend="+5%" icon={<Package />} color="blue" />
        <StatCard title="Alertas" value={lowStock.length.toString()} trend="Stock" icon={<AlertTriangle />} color="rose" />
        <StatCard title="Próximos" value={expiringSoon.length.toString()} trend="Venc." icon={<Calendar />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-rose-500 rounded-full" />
            Stock Crítico
          </h3>
          <div className="space-y-2">
            {lowStock.length > 0 ? lowStock.slice(0, 5).map(med => (
              <div key={med.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <div className="min-w-0 flex-1 pr-3">
                  <p className="font-bold text-slate-800 text-xs truncate uppercase">{med.name}</p>
                  <p className="text-[8px] text-slate-400 uppercase font-black truncate">{med.laboratory}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-black text-rose-500">{med.stockBoxes} CJs</p>
                </div>
              </div>
            )) : <p className="text-center text-slate-400 py-4 italic text-xs">Todo en orden</p>}
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            Lotes a Vencer
          </h3>
          <div className="space-y-2">
            {expiringSoon.length > 0 ? expiringSoon.slice(0, 5).map(med => (
              <div key={med.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <div className="min-w-0 flex-1 pr-3">
                  <p className="font-bold text-slate-800 text-xs truncate uppercase">{med.name}</p>
                  <p className="text-[8px] text-slate-400 uppercase font-black">LOTE: {med.batches[0].lotNumber}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-black text-amber-600">{med.batches[0].expiryDate}</p>
                </div>
              </div>
            )) : <p className="text-center text-slate-400 py-4 italic text-xs">Sin vencimientos cercanos</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, trend, icon, color }: any) => (
  <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2 rounded-xl bg-${color}-50 text-${color}-600 group-hover:scale-110 transition-transform shrink-0`}>
        {React.cloneElement(icon, { className: 'w-4 h-4 md:w-5 md:h-5' })}
      </div>
      <span className={`text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-${color}-50 text-${color}-600 uppercase`}>
        {trend}
      </span>
    </div>
    <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">{title}</p>
    <p className="text-lg md:text-xl font-black text-slate-900">{value}</p>
  </div>
);

export default Dashboard;
