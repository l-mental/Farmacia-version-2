
import React from 'react';
import { BarChart3, Download, FileSpreadsheet, PieChart, TrendingUp, Users } from 'lucide-react';

const Reports: React.FC = () => {
  return (
    <div className="p-8 space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Centro de Reportes</h2>
          <p className="text-slate-500">Análisis de rendimiento, rentabilidad y trazabilidad sanitaria.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all">
            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-emerald-600 w-5 h-5" /> Ventas Mensuales
            </h3>
            <select className="bg-slate-50 border-none rounded-lg text-xs font-bold px-3 py-2 outline-none">
              <option>Últimos 6 meses</option>
              <option>Año Actual</option>
            </select>
          </div>
          <div className="flex-1 flex items-end justify-between gap-4 pt-4">
            {[45, 60, 55, 80, 70, 95].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3">
                <div className="w-full bg-emerald-500/10 rounded-t-xl relative group" style={{ height: `${h}%` }}>
                  <div className="absolute inset-0 bg-emerald-500 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    $ {(h * 1000).toLocaleString()}
                  </div>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase">{['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-between">
          <div>
            <PieChart className="w-12 h-12 text-emerald-400 mb-6" />
            <h3 className="text-xl font-black mb-2">Composición de Cartera</h3>
            <p className="text-slate-400 text-sm">Distribución de ventas por tipo de cobertura médica.</p>
          </div>
          <div className="space-y-4">
             <ReportMetric label="Particular" value="35%" color="emerald" />
             <ReportMetric label="OSDE" value="28%" color="blue" />
             <ReportMetric label="PAMI" value="22%" color="amber" />
             <ReportMetric label="Otros" value="15%" color="slate" />
          </div>
        </div>
      </div>
    </div>
  );
};

const ReportMetric = ({ label, value, color }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
      <span className="text-slate-400">{label}</span>
      <span>{value}</span>
    </div>
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full bg-${color}-500`} style={{ width: value }} />
    </div>
  </div>
);

export default Reports;
