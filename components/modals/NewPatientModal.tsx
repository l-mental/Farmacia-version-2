
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Customer } from '@/types';

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (patient: Customer) => void;
}

const NewPatientModal: React.FC<NewPatientModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '', dni: '', insuranceId: 'PART', phone: '', email: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient: Customer = {
      id: `C${Date.now()}`,
      name: formData.name || '',
      dni: formData.dni || '',
      insuranceId: formData.insuranceId || 'PART',
      phone: formData.phone,
      email: formData.email,
      history: []
    };
    onAdd(patient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
          <h2 className="text-2xl font-black">Nuevo Paciente</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
            <input 
              type="text" required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DNI / Identificación</label>
            <input 
              type="text" required
              value={formData.dni}
              onChange={e => setFormData({...formData, dni: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
            <input 
              type="text"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
            />
          </div>
          <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/30 text-sm uppercase tracking-widest mt-4">
            Registrar Paciente
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewPatientModal;
