
import React from 'react';
import { TrendingUp, AlertTriangle, Calendar, Package } from 'lucide-react';
import { Medication } from '../types';

interface DashboardProps {
  medications: Medication[];
}

const Dashboard: React.FC<DashboardProps> = ({ medications }) => {
  const lowStock = medications.filter(m => m.stockBoxes <= m.minStock);
  const expiringSoon = medications.filter(m => {
    const expiry = new Date(m.batches[0]?.expiryDate);
    const diff = expiry.getTime() - new Date().getTime();
    return diff < (90 * 24 * 60 * 60 * 1000);
  });

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Panel de Control</h2>
          <p className="text-slate-500 text-xs md:text-sm font-medium">Farmacia FarmaSalud - Tiempo Real</p>
        </div>
        <div className="hidden sm:flex bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-600">{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Ventas Hoy" value="$45.2k" trend="+12%" icon={<TrendingUp />} color="emerald" />
        <StatCard title="Tickets" value="124" trend="+5%" icon={<Package />} color="blue" />
        <StatCard title="Alertas" value={lowStock.length.toString()} trend="Stock" icon={<AlertTriangle />} color="rose" />
        <StatCard title="Próximos" value={expiringSoon.length.toString()} trend="Venc." icon={<Calendar />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-base md:text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <div className="w-2 h-5 bg-rose-500 rounded-full" />
            Stock Crítico
          </h3>
          <div className="space-y-3">
            {lowStock.length > 0 ? lowStock.map(med => (
              <div key={med.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="min-w-0 flex-1 pr-4">
                  <p className="font-bold text-slate-800 text-xs md:text-sm truncate">{med.name}</p>
                  <p className="text-[9px] text-slate-400 uppercase font-black truncate">{med.laboratory}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs md:text-sm font-black text-rose-500">{med.stockBoxes} Cajas</p>
                </div>
              </div>
            )) : <p className="text-center text-slate-400 py-4 italic text-sm">Todo en orden</p>}
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-base md:text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <div className="w-2 h-5 bg-amber-500 rounded-full" />
            Lotes a Vencer
          </h3>
          <div className="space-y-3">
            {expiringSoon.length > 0 ? expiringSoon.map(med => (
              <div key={med.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="min-w-0 flex-1 pr-4">
                  <p className="font-bold text-slate-800 text-xs md:text-sm truncate">{med.name}</p>
                  <p className="text-[9px] text-slate-400 uppercase font-black">LOTE: {med.batches[0].lotNumber}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs md:text-sm font-black text-amber-600">{med.batches[0].expiryDate}</p>
                </div>
              </div>
            )) : <p className="text-center text-slate-400 py-4 italic text-sm">Sin vencimientos cercanos</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, trend, icon, color }: any) => (
  <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-3 md:mb-4">
      <div className={`p-2.5 md:p-3 rounded-2xl bg-${color}-50 text-${color}-600 group-hover:scale-110 transition-transform shrink-0`}>
        {React.cloneElement(icon, { className: 'w-5 h-5 md:w-6 md:h-6' })}
      </div>
      <span className={`text-[9px] md:text-[10px] font-black px-2 py-1 rounded-lg bg-${color}-50 text-${color}-600 uppercase`}>
        {trend}
      </span>
    </div>
    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
    <p className="text-xl md:text-2xl font-black text-slate-900">{value}</p>
  </div>
);

export default Dashboard;
