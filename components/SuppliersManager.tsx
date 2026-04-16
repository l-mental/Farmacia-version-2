
import React, { useState, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Search, X, Truck, 
  Phone, CreditCard, MapPin, Calendar, 
  Activity, Save, Upload, Download, Filter, 
  RefreshCw, MoreVertical, Eye, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Supplier } from '@/types';

interface SuppliersManagerProps {
  suppliers: Supplier[];
  onAdd: (supplier: Supplier) => void;
  onUpdate: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
}

const SuppliersManager: React.FC<SuppliersManagerProps> = ({ suppliers, onAdd, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    phone: '',
    ci: '',
    address: '',
    status: 'active'
  });

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.phone.includes(searchTerm) ||
    s.ci.includes(searchTerm)
  );

  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.status === 'active').length,
    inactive: suppliers.filter(s => s.status === 'inactive').length
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '', phone: '', ci: '', address: '', status: 'active'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData(supplier);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toLocaleDateString();
    
    const finalSupplier: Supplier = { 
      ...formData as Supplier, 
      id: editingSupplier ? editingSupplier.id : `PROV-${Date.now()}`,
      registrationDate: editingSupplier ? editingSupplier.registrationDate : now,
      lastUpdate: now
    };
    
    if (editingSupplier) onUpdate(finalSupplier); else onAdd(finalSupplier);
    setIsModalOpen(false);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      const now = new Date().toLocaleDateString();

      data.forEach((row: any) => {
        const newSupplier: Supplier = {
          id: `PROV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: row['PROVEEDOR'] || 'Sin Nombre',
          phone: row['TELÉFONO']?.toString() || 'N/A',
          ci: row['CI']?.toString() || 'N/A',
          address: row['DIRECCIÓN'] || 'N/A',
          status: (row['ESTADO']?.toLowerCase() === 'activo' || row['ESTADO'] === 'active') ? 'active' : 'inactive',
          registrationDate: row['REGISTRO'] || now,
          lastUpdate: now
        };
        onAdd(newSupplier);
      });
      
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert(`${data.length} proveedores importados correctamente.`);
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'PROVEEDOR': 'Droguería Inti',
        'TELÉFONO': '22233344',
        'CI': '1234567 LP',
        'DIRECCIÓN': 'Av. Blanco Galindo Km 5',
        'ESTADO': 'Activo',
        'REGISTRO': '15/04/2026'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Proveedores");
    XLSX.writeFile(wb, "Plantilla_Proveedores.xlsx");
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-full pb-28 md:pb-12">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
              <Truck className="text-white w-8 h-8"/>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800">Lista de Proveedores</h1>
              <p className="text-slate-400 text-xs md:text-sm font-medium">Gestión completa de proveedores</p>
            </div>
          </div>
          <button 
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 text-sm uppercase tracking-widest"
          >
            <Plus className="w-5 h-5"/> Registrar Nuevo
          </button>
        </header>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <span>Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-600">Proveedores</span>
        </div>

        {/* Filters Card */}
        <div className="bg-blue-700 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-black text-sm uppercase tracking-widest">
              <Filter className="w-4 h-4" /> Filtros de Búsqueda
            </div>
            <button className="text-white/60 hover:text-white flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter">
              <RefreshCw className="w-3 h-3" /> Recargar
            </button>
          </div>
          <div className="p-4 bg-white flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Buscar por nombre, teléfono o CI..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            </div>
            <div className="flex gap-2">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filtrar
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 text-white px-4 py-3 rounded-lg font-black text-xs uppercase tracking-widest flex items-center gap-2" title="Importar Excel">
                <Upload className="w-4 h-4" />
              </button>
              <button onClick={downloadTemplate} className="bg-amber-500 text-white px-4 py-3 rounded-lg font-black text-xs uppercase tracking-widest flex items-center gap-2" title="Descargar Plantilla">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-6 px-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-[10px] font-black text-slate-500 uppercase">Total: <span className="text-slate-800">{stats.total} proveedores</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-[10px] font-black text-slate-500 uppercase">Activos: <span className="text-slate-800">{stats.active}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-rose-500 rounded-full" />
              <span className="text-[10px] font-black text-slate-500 uppercase">Inactivos: <span className="text-slate-800">{stats.inactive}</span></span>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">CI</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dirección</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Registro</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actualización</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(supplier => (
                  <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">{supplier.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">ID: {supplier.id.split('-').pop()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                        <Phone className="w-3 h-3 text-emerald-500" /> {supplier.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">{supplier.ci}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate max-w-[150px]">{supplier.address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${supplier.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
                        {supplier.status === 'active' ? '✓ activo' : '✕ inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">{supplier.registrationDate}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">{supplier.lastUpdate}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditModal(supplier)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(supplier.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center opacity-20">
                        <Truck className="w-16 h-16 mb-4" />
                        <p className="font-black uppercase tracking-widest">No se encontraron proveedores</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">© 2026 Todos los derechos reservados</p>
            <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>POS</span>
              <span>v1.0.2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
              <h2 className="text-2xl font-black">{editingSupplier ? 'Editar Proveedor' : 'Registrar Proveedor'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <InputGroup label="Nombre / Razón Social" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Teléfono" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
                  <InputGroup label="CI / NIT" value={formData.ci} onChange={v => setFormData({...formData, ci: v})} />
                </div>
                <InputGroup label="Dirección" value={formData.address} onChange={v => setFormData({...formData, address: v})} />
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-sm uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/30 text-sm uppercase tracking-widest">Guardar Proveedor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const InputGroup = ({ label, value, onChange, type = "text" }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium" 
    />
  </div>
);

export default SuppliersManager;
