
import React from 'react';
import { 
  TrendingUp, AlertTriangle, Calendar, Package, AlertOctagon, 
  CheckCircle2, ArrowUpRight, ArrowDownRight, Store, DollarSign, 
  QrCode, CreditCard, Clock, ChevronRight 
} from 'lucide-react';
import { Medication, SaleRecord } from '@/types';
import { Link } from 'react-router-dom';

interface DashboardProps {
  medications: Medication[];
  currencySymbol: string;
  sales?: SaleRecord[];
}

const Dashboard: React.FC<DashboardProps> = ({ medications, currencySymbol, sales = [] }) => {
  const today = new Date().getTime();

  // Stock Alerts
  const lowStock = medications.filter(m => m.stockBoxes <= m.minStock);
  const overStock = medications.filter(m => m.maxStock && m.stockBoxes >= m.maxStock);

  const getDaysUntilExpiry = (expiryDate?: string): number | null => {
    if (!expiryDate) return null;
    const time = new Date(expiryDate).getTime();
    if (isNaN(time)) return null;
    return Math.ceil((time - today) / (1000 * 60 * 60 * 24));
  };

  // Expiry Alerts
  const expiredMeds = medications.filter(m => {
    const expStr = m.batches[0]?.expiryDate;
    if (!expStr) return false;
    const expTime = new Date(expStr).getTime();
    return !isNaN(expTime) && expTime < today;
  });

  const shortExpiryMeds = medications.filter(m => {
    const expStr = m.batches[0]?.expiryDate;
    if (!expStr) return false;
    const expTime = new Date(expStr).getTime();
    if (isNaN(expTime)) return false;
    const diff = expTime - today;
    return diff >= 0 && diff < (90 * 24 * 60 * 60 * 1000); // within 90 days
  });

  const longExpiryMeds = medications.filter(m => {
    const expStr = m.batches[0]?.expiryDate;
    if (!expStr) return false;
    const expTime = new Date(expStr).getTime();
    if (isNaN(expTime)) return false;
    const diff = expTime - today;
    return diff >= (90 * 24 * 60 * 60 * 1000); // more than 90 days
  });

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Panel de Control & Alertas Sanitarias</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Control de Vencimientos, Stock y Alertas de Inventario</p>
        </div>
      </div>

      {/* Primary KPI & Alert Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard 
          title="Stock Mínimo" 
          value={lowStock.length.toString()} 
          trend="Reponer" 
          icon={<AlertTriangle className="text-rose-600" />} 
          badgeClass="bg-rose-50 text-rose-700" 
          borderClass="border-rose-100"
        />
        <StatCard 
          title="Stock Máximo" 
          value={overStock.length.toString()} 
          trend="Exceso" 
          icon={<ArrowUpRight className="text-purple-600" />} 
          badgeClass="bg-purple-50 text-purple-700" 
          borderClass="border-purple-100"
        />
        <StatCard 
          title="Vencidos" 
          value={expiredMeds.length.toString()} 
          trend="Retirar" 
          icon={<AlertOctagon className="text-rose-600" />} 
          badgeClass="bg-rose-100 text-rose-800" 
          borderClass="border-rose-200"
        />
        <StatCard 
          title="Venc. Corto" 
          value={shortExpiryMeds.length.toString()} 
          trend="< 90 Días" 
          icon={<Calendar className="text-amber-600" />} 
          badgeClass="bg-amber-50 text-amber-700" 
          borderClass="border-amber-100"
        />
        <StatCard 
          title="Venc. Largo" 
          value={longExpiryMeds.length.toString()} 
          trend="Óptimo" 
          icon={<CheckCircle2 className="text-emerald-600" />} 
          badgeClass="bg-emerald-50 text-emerald-700" 
          borderClass="border-emerald-100"
        />
      </div>

      {/* Expiry Alerts Grid: Vencidos vs Vencimiento Corto with Countdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Alerta de Lotes Vencidos */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-rose-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-rose-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              Lotes Vencidos (Retiro Inmediato)
            </h3>
            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-lg">
              {expiredMeds.length} Alertas
            </span>
          </div>

          <div className="space-y-2.5">
            {expiredMeds.length > 0 ? expiredMeds.map(med => {
              const days = getDaysUntilExpiry(med.batches[0]?.expiryDate);
              return (
                <div key={med.id} className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-rose-200 text-rose-800 rounded">
                        VENCIDO {days !== null ? `HACE ${Math.abs(days)}d` : ''}
                      </span>
                      <p className="font-black text-slate-800 text-xs truncate uppercase">{med.name}</p>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold truncate">
                      Genérico: {med.genericName || 'N/A'} • Lab: {med.laboratory}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-rose-600">{med.batches[0]?.expiryDate}</p>
                    <p className="text-[9px] font-bold text-slate-400">Lote: {med.batches[0]?.lotNumber}</p>
                  </div>
                </div>
              );
            }) : (
              <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs italic bg-slate-50 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>No hay medicamentos vencidos en almacén.</span>
              </div>
            )}
          </div>
        </div>

        {/* Alerta de Vencimiento Corto (<90 días) */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-amber-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-amber-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Vencimiento Corto (Menor a 90 días)
            </h3>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-lg">
              {shortExpiryMeds.length} Alertas
            </span>
          </div>

          <div className="space-y-2.5">
            {shortExpiryMeds.length > 0 ? shortExpiryMeds.map(med => {
              const days = getDaysUntilExpiry(med.batches[0]?.expiryDate);
              return (
                <div key={med.id} className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded">
                        VENCE EN {days !== null ? `${days} DÍAS` : 'CORTO PLAZO'}
                      </span>
                      <p className="font-black text-slate-800 text-xs truncate uppercase">{med.name}</p>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold truncate">
                      Genérico: {med.genericName || 'N/A'} • {med.stockBoxes} Cajas disp.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-amber-700">{med.batches[0]?.expiryDate}</p>
                    <p className="text-[9px] font-bold text-slate-400">Lote: {med.batches[0]?.lotNumber}</p>
                  </div>
                </div>
              );
            }) : (
              <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl">
                Sin medicamentos con vencimiento a corto plazo.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Alerts Grid: Stock Mínimo vs Stock Máximo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Alerta de Stock Mínimo */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-rose-500 rounded-full" />
              Stock Crítico (Bajo Mínimo Permitido)
            </h3>
            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg">
              {lowStock.length} Productos
            </span>
          </div>

          <div className="space-y-2">
            {lowStock.length > 0 ? lowStock.map(med => (
              <div key={med.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-colors">
                <div className="min-w-0 flex-1 pr-3">
                  <p className="font-bold text-slate-800 text-xs truncate uppercase">{med.name}</p>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold">
                    Genérico: {med.genericName || 'N/A'} • Mínimo: {med.minStock} cjs
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-rose-600">{med.stockBoxes} Cajas</p>
                  <p className="text-[9px] font-bold text-slate-400">{med.stockUnits} Uds</p>
                </div>
              </div>
            )) : <p className="text-center text-slate-400 py-4 italic text-xs">Todos los productos sobre el stock mínimo.</p>}
          </div>
        </div>

        {/* Alerta de Stock Máximo */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
              Sobre-Stock (Alcanzó o Superó Stock Máximo)
            </h3>
            <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">
              {overStock.length} Productos
            </span>
          </div>

          <div className="space-y-2">
            {overStock.length > 0 ? overStock.map(med => (
              <div key={med.id} className="flex items-center justify-between p-3 bg-purple-50/40 rounded-xl">
                <div className="min-w-0 flex-1 pr-3">
                  <p className="font-bold text-slate-800 text-xs truncate uppercase">{med.name}</p>
                  <p className="text-[9px] text-purple-700/80 uppercase font-semibold">
                    Genérico: {med.genericName || 'N/A'} • Máx Configurado: {med.maxStock} cjs
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-purple-700">{med.stockBoxes} Cajas</p>
                  <span className="text-[8px] font-black bg-purple-200/80 text-purple-900 px-1 rounded">SOBRESTOCK</span>
                </div>
              </div>
            )) : <p className="text-center text-slate-400 py-4 italic text-xs">Ningún producto excede el stock máximo fijado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  icon: React.ReactNode;
  badgeClass: string;
  borderClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, icon, badgeClass, borderClass = 'border-slate-100' }) => (
  <div className={`bg-white p-3.5 md:p-4 rounded-2xl border ${borderClass} shadow-sm hover:shadow-md transition-all group`}>
    <div className="flex justify-between items-start mb-2">
      <div className="p-2 rounded-xl bg-slate-50 group-hover:scale-110 transition-transform shrink-0">
        {icon}
      </div>
      <span className={`text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded-lg uppercase ${badgeClass}`}>
        {trend}
      </span>
    </div>
    <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-0.5">{title}</p>
    <p className="text-lg md:text-xl font-black text-slate-900">{value}</p>
  </div>
);

export default Dashboard;
