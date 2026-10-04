import React, { useState } from 'react';
import { 
  Users, UserPlus, Shield, Mail, Phone, Trash2, Edit2, Search, X, 
  BarChart2, Lock, Lightbulb, Check, CheckSquare, Square,
  LayoutDashboard, ShoppingCart, Pill, BarChart3, Truck, ShoppingBag, 
  UserCog, Store, KeyRound, Sparkles
} from 'lucide-react';
import { User, UserRole, AppSection, UserPermissions, DEFAULT_ROLE_PERMISSIONS } from '@/types';
import { pushCollectionToSupabase } from '@/services/supabaseService';
import { broadcastSyncEvent } from '@/services/autoSyncService';

interface StaffManagerProps {
  staff: User[];
  onAdd: (user: User) => void;
  onUpdate: (user: User) => void;
  onDelete: (id: string) => void;
  sales: any[];
  currentUserRole?: string;
}

interface SectionOption {
  id: AppSection;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const AVAILABLE_SECTIONS: SectionOption[] = [
  { id: 'DASHBOARD', label: 'Dashboard / Métricas', description: 'Resumen ejecutivo de ingresos y métricas', icon: LayoutDashboard },
  { id: 'POS', label: 'Caja / Punto de Venta', description: 'Venta de mostrador, facturación y emisión de recibos', icon: ShoppingCart },
  { id: 'INVENTORY', label: 'Control de Inventario', description: 'Consulta de existencias, lotes y vencimientos', icon: Pill },
  { id: 'REPORTS', label: 'Reportes y Facturas Excel', description: 'Libros de ventas oficiales y auditoría contable', icon: BarChart3 },
  { id: 'CUSTOMERS', label: 'Pacientes / Clientes', description: 'Padrón de clientes e historial de compras', icon: Users },
  { id: 'SUPPLIERS', label: 'Proveedores Farmacéuticos', description: 'Directorio de laboratorios y distribuidores', icon: Truck },
  { id: 'PURCHASES', label: 'Compras y Adquisiciones', description: 'Registro de órdenes y reabastecimiento', icon: ShoppingBag },
  { id: 'STAFF', label: 'Personal y Control de Roles', description: 'Administración de usuarios y permisos del sistema', icon: UserCog }
];

const StaffManager: React.FC<StaffManagerProps> = ({ 
  staff, 
  onAdd, 
  onUpdate, 
  onDelete, 
  sales, 
  currentUserRole = 'ADMIN' 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    username: '',
    password: '',
    phone: '',
    email: '',
    role: 'EMPLOYEE',
    customRoleName: '',
    assignedRegister: 'Caja 1',
    permissions: {
      allowedSections: ['POS', 'INVENTORY', 'CUSTOMERS'],
      canEditInventory: false
    }
  });

  if (currentUserRole !== 'ADMIN') {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto text-center space-y-8 py-16 animate-in fade-in duration-500">
        <div className="inline-flex bg-amber-500/10 text-amber-500 p-6 rounded-full border border-amber-500/10 shadow-lg shadow-amber-500/5 animate-bounce-subtle">
          <Lock className="w-14 h-14" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Acceso Restringido: <span className="text-emerald-600">Gestión de Personal</span></h2>
          <p className="text-slate-500 max-w-lg mx-auto leading-relaxed text-sm">
            Tu usuario actual no posee privilegios de <strong className="text-slate-700">Administrador</strong> para gestionar las cuentas, roles y permisos de acceso del equipo.
          </p>
        </div>
      </div>
    );
  }

  const handleRolePresetChange = (role: UserRole) => {
    let allowed: AppSection[] = [];
    let canEditInv = false;

    if (role === 'ADMIN') {
      allowed = ['DASHBOARD', 'POS', 'INVENTORY', 'REPORTS', 'CUSTOMERS', 'SUPPLIERS', 'PURCHASES', 'STAFF'];
      canEditInv = true;
    } else if (role === 'PHARMACIST') {
      allowed = ['DASHBOARD', 'POS', 'INVENTORY', 'CUSTOMERS', 'PURCHASES'];
      canEditInv = true;
    } else if (role === 'EMPLOYEE') {
      allowed = ['POS', 'INVENTORY', 'CUSTOMERS'];
      canEditInv = false; // Cashiers cannot manipulate inventory
    } else if (role === 'CUSTOM') {
      // Keep existing or set default basic
      allowed = formData.permissions?.allowedSections?.length ? formData.permissions.allowedSections : ['POS'];
      canEditInv = formData.permissions?.canEditInventory ?? false;
    }

    setFormData(prev => ({
      ...prev,
      role,
      permissions: {
        allowedSections: allowed,
        canEditInventory: canEditInv
      }
    }));
  };

  const toggleSectionPermission = (sectionId: AppSection) => {
    setFormData(prev => {
      const current = prev.permissions?.allowedSections || [];
      const exists = current.includes(sectionId);
      const newAllowed = exists 
        ? current.filter(s => s !== sectionId)
        : [...current, sectionId];

      return {
        ...prev,
        // If they manually customize, mark as CUSTOM unless all/standard
        role: prev.role === 'ADMIN' && exists ? 'CUSTOM' : prev.role,
        permissions: {
          allowedSections: newAllowed,
          canEditInventory: prev.permissions?.canEditInventory ?? false
        }
      };
    });
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.customRoleName && s.customRoleName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStaffSales = (userId: string) => {
    return sales.filter(s => s.userId === userId);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      phone: '',
      email: '',
      role: 'EMPLOYEE',
      customRoleName: '',
      assignedRegister: 'Caja 1',
      permissions: {
        allowedSections: ['POS', 'INVENTORY', 'CUSTOMERS'],
        canEditInventory: false
      }
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    // Resolve permissions if user didn't have explicit object
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[user.role as UserRole] || DEFAULT_ROLE_PERMISSIONS.EMPLOYEE;
    setFormData({
      ...user,
      permissions: user.permissions || defaultPerms
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      alert('Por favor ingrese el nombre del personal.');
      return;
    }
    if (!formData.username?.trim()) {
      alert('Por favor ingrese el nombre de usuario.');
      return;
    }

    const role = formData.role || 'EMPLOYEE';
    const allowed = formData.permissions?.allowedSections || ['POS'];
    const canEditInv = Boolean(formData.permissions?.canEditInventory);

    const newUser: User = {
      id: editingUser?.id || `U${Date.now()}`,
      name: formData.name.trim(),
      username: formData.username.trim().toLowerCase(),
      password: formData.password || (editingUser ? editingUser.password : '123'),
      phone: formData.phone?.trim() || '',
      email: formData.email?.trim() || '',
      role: role as UserRole,
      customRoleName: formData.customRoleName?.trim() || (role === 'CUSTOM' ? 'Rol Personalizado' : undefined),
      assignedRegister: formData.assignedRegister || 'Caja 1',
      permissions: {
        allowedSections: allowed,
        canEditInventory: canEditInv
      }
    };

    setIsModalOpen(false);

    if (editingUser) {
      const nextStaff = staff.map(u => u.id === newUser.id ? newUser : u);
      onUpdate(newUser);
      await pushCollectionToSupabase('staff', nextStaff);
      broadcastSyncEvent('STAFF_UPDATED', { staff: nextStaff });
    } else {
      const nextStaff = [...staff, newUser];
      onAdd(newUser);
      await pushCollectionToSupabase('staff', nextStaff);
      broadcastSyncEvent('STAFF_UPDATED', { staff: nextStaff });
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Gestión de Personal y Roles</h2>
          </div>
          <p className="text-slate-400 text-xs font-medium mt-1">
            Configura a qué módulos y funciones tiene permiso de entrar cada usuario del sistema.
          </p>
        </div>

        <button 
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95"
        >
          <UserPlus className="w-4 h-4" /> 
          <span>+ Nuevo Personal / Rol</span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <input 
            type="text" 
            placeholder="Buscar por nombre, usuario o rol..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold text-slate-700 shadow-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs font-bold text-slate-400">
          Total: <span className="text-slate-800 font-black">{filteredStaff.length} usuarios</span>
        </div>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStaff.map(member => {
          const memberSales = getStaffSales(member.id);
          const totalRevenue = memberSales.reduce((sum, s) => sum + s.total, 0);
          
          const allowedSections = member.permissions?.allowedSections || 
            (DEFAULT_ROLE_PERMISSIONS[member.role as UserRole] || DEFAULT_ROLE_PERMISSIONS.EMPLOYEE).allowedSections;
          
          const canEditInv = member.permissions ? member.permissions.canEditInventory : (member.role === 'ADMIN' || member.role === 'PHARMACIST');

          const roleDisplay = member.customRoleName || 
            (member.role === 'ADMIN' ? 'Administrador' : member.role === 'PHARMACIST' ? 'Farmacéutico' : 'Cajero / Empleado');

          const roleColor = 
            member.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200' :
            member.role === 'PHARMACIST' ? 'bg-blue-100 text-blue-700 border-blue-200' :
            member.role === 'CUSTOM' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
            'bg-emerald-100 text-emerald-700 border-emerald-200';

          return (
            <div key={member.id} className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg shadow-sm">
                    {member.name.charAt(0)}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${roleColor}`}>
                    {roleDisplay}
                  </span>
                </div>

                <div className="mb-3">
                  <h3 className="text-sm font-black text-slate-800 truncate">{member.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-400 font-bold">@{member.username}</span>
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.2 rounded-full font-bold">
                      {member.assignedRegister || 'Caja 1'}
                    </span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold mt-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {member.phone}
                    </div>
                  )}
                </div>

                {/* Permissions Badges */}
                <div className="mb-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                    Permisos de Acceso ({allowedSections.length} módulos):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {allowedSections.map(sec => {
                      const secInfo = AVAILABLE_SECTIONS.find(s => s.id === sec);
                      const isInventory = sec === 'INVENTORY';
                      return (
                        <span 
                          key={sec} 
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            isInventory && !canEditInv 
                              ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                              : 'bg-slate-100 text-slate-700'
                          }`}
                          title={isInventory ? (canEditInv ? 'Acceso y modificación' : 'Solo lectura') : secInfo?.label}
                        >
                          {secInfo?.label.split('/')[0].trim() || sec}
                          {isInventory && (
                            <span className="text-[8px] opacity-75 font-normal ml-0.5">
                              ({canEditInv ? 'Edita' : 'Lectura'})
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ventas</p>
                    <p className="text-xs font-black text-slate-800">{memberSales.length}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</p>
                    <p className="text-xs font-black text-emerald-600">${totalRevenue.toFixed(0)}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button 
                  onClick={() => openEditModal(member)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-xl text-[11px] font-bold transition-colors"
                >
                  <Edit2 className="w-3 h-3" /> Editar Roles
                </button>
                <button 
                  onClick={async () => {
                    if (confirm(`¿Eliminar al usuario ${member.name}?`)) {
                      const nextStaff = staff.filter(u => u.id !== member.id);
                      onDelete(member.id);
                      await pushCollectionToSupabase('staff', nextStaff);
                      broadcastSyncEvent('STAFF_UPDATED', { staff: nextStaff });
                    }
                  }}
                  className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Eliminar usuario"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT STAFF & ROLE PERMISSIONS MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-xl">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black">
                    {editingUser ? 'Editar Personal y Permisos' : 'Crear Usuario y Asignar Rol'}
                  </h2>
                  <p className="text-indigo-300 text-[10px] font-bold">
                    Define a qué módulos puede y no puede entrar este usuario
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 no-scrollbar">
              {/* Basic Account Info */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">
                  1. Datos de la Cuenta
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Completo *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: Laura Vargas"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Usuario de Acceso *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: laura.vargas"
                      value={formData.username || ''}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      {editingUser ? 'Contraseña (Opcional si no cambia)' : 'Contraseña de Acceso *'}
                    </label>
                    <input 
                      type="password" 
                      required={!editingUser}
                      placeholder={editingUser ? "Dejar en blanco para mantener" : "••••••••"}
                      value={formData.password || ''}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Caja Asignada</label>
                    <select
                      value={formData.assignedRegister || 'Caja 1'}
                      onChange={e => setFormData({...formData, assignedRegister: e.target.value as 'Caja 1' | 'Caja 2'})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-800"
                    >
                      <option value="Caja 1">Caja 1</option>
                      <option value="Caja 2">Caja 2</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Celular / Teléfono</label>
                    <input 
                      type="tel" 
                      placeholder="70000000"
                      value={formData.phone || ''}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Correo Electrónico</label>
                    <input 
                      type="email" 
                      placeholder="usuario@farmacia.bo"
                      value={formData.email || ''}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Role Selection & Preset */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">
                  2. Tipo de Rol
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { role: 'EMPLOYEE' as UserRole, label: 'Cajero / Empleado', desc: 'Ventas y consulta' },
                    { role: 'PHARMACIST' as UserRole, label: 'Farmacéutico', desc: 'Edita stock y POS' },
                    { role: 'ADMIN' as UserRole, label: 'Administrador', desc: 'Acceso a todo' },
                    { role: 'CUSTOM' as UserRole, label: 'Personalizado', desc: 'Permisos a medida' }
                  ].map(item => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => handleRolePresetChange(item.role)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        formData.role === item.role
                          ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`text-xs font-black block ${formData.role === item.role ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>

                {formData.role === 'CUSTOM' && (
                  <div className="flex flex-col gap-1 p-3 bg-indigo-50/50 border border-indigo-200 rounded-2xl">
                    <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest ml-1">
                      Nombre del Rol Personalizado:
                    </label>
                    <input 
                      type="text"
                      placeholder="Ej: Encargado de Almacén, Auditor, Cajero Noche..."
                      value={formData.customRoleName || ''}
                      onChange={e => setFormData({...formData, customRoleName: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Step 3: Granular Permissions Matrix */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">
                    3. ¿A qué módulos puede y no puede entrar?
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600">
                    {formData.permissions?.allowedSections?.length || 0} de {AVAILABLE_SECTIONS.length} seleccionados
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_SECTIONS.map(section => {
                    const isAllowed = formData.permissions?.allowedSections?.includes(section.id);
                    const Icon = section.icon;

                    return (
                      <div
                        key={section.id}
                        onClick={() => toggleSectionPermission(section.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isAllowed 
                            ? 'bg-emerald-50/60 border-emerald-300' 
                            : 'bg-slate-50/80 border-slate-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isAllowed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${isAllowed ? 'text-emerald-950 font-black' : 'text-slate-700'}`}>
                              {section.label}
                            </span>
                            <input 
                              type="checkbox" 
                              checked={isAllowed} 
                              onChange={() => {}} // Handled by parent div click
                              className="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sub-permission for Inventory: Edit vs Read-Only */}
                {formData.permissions?.allowedSections?.includes('INVENTORY') && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-black text-amber-900 block">
                        Permiso de Modificación en Inventario
                      </span>
                      <span className="text-[10px] text-amber-700">
                        {formData.permissions?.canEditInventory 
                          ? 'Puede agregar nuevos medicamentos, reabastecer stock y editar precios.'
                          : 'Modo solo lectura: Consulta de precios y lotes para vender, sin poder alterar existencias.'}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox"
                        checked={formData.permissions?.canEditInventory || false}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          permissions: {
                            allowedSections: prev.permissions?.allowedSections || [],
                            canEditInventory: e.target.checked
                          }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 rounded-2xl">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-600/30 text-xs uppercase tracking-wider transition-all active:scale-95"
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManager;
