
import React from 'react';
import { Globe, Users } from 'lucide-react';
import { Customer, SaleRecord, Currency } from '@/types';

interface CustomersManagerProps {
  customers: Customer[];
  sales: SaleRecord[];
  currency: Currency;
  onOpenAddModal: () => void;
}

const CustomersManager: React.FC<CustomersManagerProps> = ({ customers, sales, currency, onOpenAddModal }) => {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800">Gestión de Pacientes</h2>
        <button 
          onClick={onOpenAddModal}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"
        >
          + Nuevo Paciente
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {customers.map(customer => (
          <div key={customer.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-lg">
                {customer.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-slate-800 text-sm truncate uppercase">{customer.name}</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">DNI: {customer.dni}</p>
              </div>
            </div>
            <div className="space-y-1 mb-4">
              <p className="text-[11px] text-slate-500 flex items-center gap-2 truncate"><Globe className="w-3 h-3 shrink-0"/> {customer.email}</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-2"><Users className="w-3 h-3 shrink-0"/> {customer.insuranceId}</p>
            </div>
            <div className="border-t border-slate-50 pt-3">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Historial</h4>
              {customer.history.length === 0 ? (
                <p className="text-[10px] text-slate-300 italic">Sin registros</p>
              ) : (
                <div className="space-y-1.5 overflow-y-auto max-h-24 no-scrollbar">
                  {customer.history.map(saleId => {
                    const sale = sales.find(s => s.id === saleId);
                    if (!sale) return null;
                    return (
                      <div key={saleId} className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-400">{new Date(sale.timestamp).toLocaleDateString()}</span>
                        <span className="text-emerald-600">{currency.symbol}{sale.total.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomersManager;
