
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
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-800">Gestión de Pacientes</h2>
        <button 
          onClick={onOpenAddModal}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
        >
          + Nuevo Paciente
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map(customer => (
          <div key={customer.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xl">
                {customer.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-black text-slate-800">{customer.name}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">DNI: {customer.dni}</p>
              </div>
            </div>
            <div className="space-y-2 mb-6">
              <p className="text-xs text-slate-500 flex items-center gap-2"><Globe className="w-3 h-3"/> {customer.email}</p>
              <p className="text-xs text-slate-500 flex items-center gap-2"><Users className="w-3 h-3"/> {customer.insuranceId}</p>
            </div>
            <div className="border-t border-slate-50 pt-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Historial de Compras</h4>
              {customer.history.length === 0 ? (
                <p className="text-xs text-slate-300 italic">Sin registros de ventas</p>
              ) : (
                <div className="space-y-2">
                  {customer.history.map(saleId => {
                    const sale = sales.find(s => s.id === saleId);
                    if (!sale) return null;
                    return (
                      <div key={saleId} className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-500">{new Date(sale.timestamp).toLocaleDateString()}</span>
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
