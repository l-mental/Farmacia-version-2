
import React, { useState } from 'react';
import { 
  Plus, Edit2, Trash2, Search, X, Pill, 
  Package, AlertTriangle, Calendar, Activity, 
  ShieldCheck, Save, Image as ImageIcon, 
  FileText, Hash, DollarSign, ChevronRight 
} from 'lucide-react';
import { Medication, Category, Batch } from '../types';

interface InventoryManagerProps {
  medications: Medication[];
  onAdd: (med: Medication) => void;
  onUpdate: (med: Medication) => void;
  onDelete: (id: string) => void;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({ medications, onAdd, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);

  const [formData, setFormData] = useState<Partial<Medication>>({
    name: '',
    genericName: '',
    laboratory: '',
    description: '',
    priceBox: 0,
    priceUnit: 0,
    unitsPerBox: 1,
    category: Category.OTHERS,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400',
    stockBoxes: 0,
    stockUnits: 0,
    isControlled: false,
    minStock: 5,
    batches: [{ lotNumber: '', expiryDate: '', quantity: 0 }]
  });

  const filtered = medications.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.genericName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    setEditingMed(null);
    setFormData({
      name: '', genericName: '', laboratory: '', description: '',
      priceBox: 0, priceUnit: 0, unitsPerBox: 1,
      category: Category.OTHERS, imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400',
      stockBoxes: 0, stockUnits: 0, isControlled: false, minStock: 5,
      batches: [{ lotNumber: 'L-' + Math.floor(Math.random() * 9000), expiryDate: '', quantity: 0 }]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (med: Medication) => {
    setEditingMed(med);
    setFormData(med);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalMed: Medication = { ...formData as Medication, id: editingMed ? editingMed.id : Date.now().toString() };
    if (editingMed) onUpdate(finalMed); else onAdd(finalMed);
    setIsModalOpen(false);
  };

  const getExpiryStatus = (expiryDate: string) => {
    if (!expiryDate) return { label: 'N/A', color: 'bg-slate-300' };
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Vencido', color: 'bg-rose-500' };
    if (diffDays < 90) return { label: 'Próximo', color: 'bg-amber-500' };
    return { label: 'OK', color: 'bg-emerald-500' };
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-full pb-28 md:pb-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-2">
              <Package className="text-emerald-600 w-6 h-6 md:w-8 md:h-8"/> Existencias
            </h1>
            <p className="text-slate-400 text-xs md:text-sm font-medium">Control de lotes y trazabilidad.</p>
          </div>
          <div className="flex flex-col xs:flex-row gap-3">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            </div>
            <button 
              onClick={openAddModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4"/> Nuevo
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {filtered.map(med => (
            <div key={med.id} className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors flex flex-col md:flex-row gap-4 md:gap-8 items-start md:items-center relative">
              <div className="flex items-center gap-4 w-full md:w-auto md:min-w-[280px]">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center border border-slate-100 shrink-0 overflow-hidden">
                  <img src={med.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-black text-slate-800 truncate">{med.name}</h3>
                  <p className="text-[10px] md:text-xs text-slate-400 italic truncate">{med.genericName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full flex-1 border-t md:border-t-0 pt-4 md:pt-0">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5 md:mb-1">Precio Unit</span>
                  <span className="text-sm md:text-base font-black text-slate-800">${med.priceUnit}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5 md:mb-1">Existencia</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm md:text-base font-black ${med.stockBoxes <= med.minStock ? 'text-rose-600' : 'text-slate-800'}`}>
                      {med.stockBoxes} C / {med.stockUnits} U
                    </span>
                  </div>
                </div>
                <div className="hidden lg:flex flex-col">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Laboratorio</span>
                  <span className="text-xs font-bold text-slate-600 truncate">{med.laboratory}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Vencimiento</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${getExpiryStatus(med.batches[0]?.expiryDate).color}`} />
                    <span className="text-xs font-bold text-slate-600">{med.batches[0]?.expiryDate || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 justify-end">
                <button 
                  onClick={() => openEditModal(med)}
                  className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg md:rounded-xl transition-all border border-slate-100 flex items-center justify-center"
                >
                  <Edit2 className="w-4 h-4"/>
                </button>
                <button 
                  onClick={() => onDelete(med.id)}
                  className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg md:rounded-xl transition-all border border-slate-100 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Adaptativo */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 md:p-4 animate-in fade-in slide-in-from-bottom-10 duration-300">
            <div className="bg-white w-full max-w-4xl md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-auto md:max-h-[90vh]">
              <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <h2 className="text-xl md:text-2xl font-black">{editingMed ? 'Editar' : 'Nuevo Producto'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <InputGroup label="Nombre" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
                  <InputGroup label="Genérico" value={formData.genericName} onChange={v => setFormData({...formData, genericName: v})} />
                  <InputGroup label="Laboratorio" value={formData.laboratory} onChange={v => setFormData({...formData, laboratory: v})} />
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as Category})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium">
                      {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100">
                  <InputGroup label="Precio Caja" type="number" value={formData.priceBox?.toString()} onChange={v => setFormData({...formData, priceBox: parseFloat(v)})} />
                  <InputGroup label="Uds x Caja" type="number" value={formData.unitsPerBox?.toString()} onChange={v => setFormData({...formData, unitsPerBox: parseInt(v)})} />
                  <InputGroup label="Stock Caja" type="number" value={formData.stockBoxes?.toString()} onChange={v => setFormData({...formData, stockBoxes: parseInt(v)})} />
                  <InputGroup label="Lote" value={formData.batches?.[0]?.lotNumber} onChange={v => {
                    const b = [...(formData.batches || [])]; b[0] = {...b[0], lotNumber: v}; setFormData({...formData, batches: b});
                  }} />
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-sm uppercase tracking-widest">Cancelar</button>
                  <button type="submit" className="w-full md:flex-[2] py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/30 text-sm uppercase tracking-widest">Guardar Cambios</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const InputGroup = ({ label, value, onChange, type = "text" }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type={type} value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium" 
    />
  </div>
);

export default InventoryManager;
