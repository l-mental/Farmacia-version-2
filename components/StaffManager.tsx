
import React, { useState } from 'react';
import { Users, UserPlus, Shield, Mail, Phone, Trash2, Edit2, Search, X, BarChart2 } from 'lucide-react';
import { User, UserRole } from '../types';

interface StaffManagerProps {
  staff: User[];
  onAdd: (user: User) => void;
  onUpdate: (user: User) => void;
  onDelete: (id: string) => void;
  sales: any[]; // To show performance
}

const StaffManager: React.FC<StaffManagerProps> = ({ staff, onAdd, onUpdate, onDelete, sales }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    username: '',
    password: '',
    phone: '',
    email: '',
    role: 'EMPLOYEE'
  });

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStaffSales = (userId: string) => {
    return sales.filter(s => s.userId === userId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: editingUser?.id || `U${Date.now()}`,
      name: formData.name || '',
      username: formData.username || '',
      password: formData.password || '',
      phone: formData.phone || '',
      email: formData.email || '',
      role: formData.role as UserRole
    };
    if (editingUser) onUpdate(newUser);
    else onAdd(newUser);
    setIsModalOpen(false);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Gestión de Personal</h2>
          <p className="text-slate-500">Administra los accesos y monitorea el rendimiento del equipo.</p>
        </div>
        <button 
          onClick={() => { setEditingUser(null); setFormData({ name: '', username: '', password: '', phone: '', email: '', role: 'EMPLOYEE' }); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Nuevo Empleado
        </button>
      </div>

      <div className="relative max-w-md">
        <input 
          type="text" 
          placeholder="Buscar personal..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map(member => {
          const memberSales = getStaffSales(member.id);
          const totalRevenue = memberSales.reduce((sum, s) => sum + s.total, 0);
          
          return (
            <div key={member.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-2xl">
                  {member.name.charAt(0)}
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${member.role === 'ADMIN' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {member.role}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-800">{member.name}</h3>
                <p className="text-xs text-slate-400 font-bold mb-2">@{member.username}</p>
                <div className="space-y-1">
                  {member.phone && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                      <Phone className="w-3 h-3" /> {member.phone}
                    </div>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                      <Mail className="w-3 h-3" /> {member.email}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ventas</p>
                  <p className="text-sm font-black text-slate-800">{memberSales.length}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                  <p className="text-sm font-black text-emerald-600">${totalRevenue.toFixed(0)}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-50">
                <button 
                  onClick={() => { setEditingUser(member); setFormData(member); setIsModalOpen(true); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
                <button 
                  onClick={() => onDelete(member.id)}
                  className="p-2 text-rose-400 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
              <h2 className="text-2xl font-black">{editingUser ? 'Editar Personal' : 'Nuevo Personal'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario</label>
                  <input 
                    type="text" 
                    required
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                  <input 
                    type="password" 
                    required={!editingUser}
                    placeholder={editingUser ? "Dejar en blanco para mantener" : ""}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Celular</label>
                    <input 
                      type="tel" 
                      required
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo (Opcional)</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
                  >
                    <option value="EMPLOYEE">Empleado</option>
                    <option value="PHARMACIST">Farmacéutico</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/30 text-sm uppercase tracking-widest">
                {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManager;
