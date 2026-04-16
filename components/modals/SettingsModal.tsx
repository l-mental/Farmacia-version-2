
import React from 'react';
import { X, Trash2, Plus, Bot } from 'lucide-react';
import { Currency } from '@/types';
import { SUPPORTED_CURRENCIES } from '@/constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  businessQR: string | null;
  setBusinessQR: (qr: string | null) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, currency, setCurrency, businessQR, setBusinessQR 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black">Configuración</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Regional & Moneda</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] no-scrollbar">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Símbolo de Moneda</label>
            <div className="grid grid-cols-2 gap-3">
              {SUPPORTED_CURRENCIES.map(curr => (
                <button
                  key={curr.code}
                  onClick={() => setCurrency(curr)}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${currency.code === curr.code ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                >
                  <div className="text-left">
                    <p className="font-black text-slate-800 text-sm">{curr.code}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{curr.name}</p>
                  </div>
                  <span className="text-xl font-black text-emerald-600">{curr.symbol}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">QR de Pago del Negocio</label>
            <div className="flex flex-col gap-4">
              {businessQR ? (
                <div className="relative w-full aspect-square max-w-[200px] mx-auto bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden group">
                  <img src={businessQR} alt="Business QR" className="w-full h-full object-contain p-4" />
                  <button 
                    onClick={() => {
                      setBusinessQR(null);
                      localStorage.removeItem('FARMA_QR');
                    }}
                    className="absolute inset-0 bg-rose-600/80 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-8 h-8 mb-2" />
                    <span className="text-xs font-black uppercase">Eliminar QR</span>
                  </button>
                </div>
              ) : (
                <div className="w-full aspect-square max-w-[200px] mx-auto bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Bot className="w-10 h-10 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin QR configurado</p>
                </div>
              )}
              
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64 = reader.result as string;
                        setBusinessQR(base64);
                        localStorage.setItem('FARMA_QR', base64);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden" 
                  id="qr-upload"
                />
                <label 
                  htmlFor="qr-upload"
                  className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer hover:bg-emerald-700 transition-all text-sm uppercase tracking-widest"
                >
                  <Plus className="w-5 h-5" /> {businessQR ? 'Cambiar QR' : 'Subir QR de Pago'}
                </label>
              </div>
              <p className="text-[9px] text-slate-400 text-center italic">Este QR se mostrará a los clientes cuando elijan pago por QR.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
