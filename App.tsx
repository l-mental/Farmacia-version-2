
import React, { useState } from 'react';
import { MOCK_MEDICATIONS, MOCK_CUSTOMERS, SUPPORTED_CURRENCIES } from './constants';
import { Medication, User, SaleItem, InsurancePlan, PrescriptionData, Customer, SaleRecord, Currency } from './types';
import Login from './components/Login';
import PosSystem from './components/PosSystem';
import InventoryManager from './components/InventoryManager';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import AIConsultant from './components/AIConsultant';
import StaffManager from './components/StaffManager';
import { HeartPulse, LayoutDashboard, ShoppingCart, Pill, LogOut, Bot, BarChart3, Users, Settings, Sparkles, Menu, Globe, X, UserCog } from 'lucide-react';

type TabType = 'DASHBOARD' | 'POS' | 'INVENTORY' | 'REPORTS' | 'CUSTOMERS' | 'STAFF' | 'SETTINGS';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [medications, setMedications] = useState<Medication[]>(MOCK_MEDICATIONS);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [staff, setStaff] = useState<User[]>([
    { id: 'U1', name: 'Admin Principal', username: 'admin', password: 'admin', phone: '999888777', role: 'ADMIN' },
    { id: 'U2', name: 'Empleado Demo', username: 'empleado', password: '123', phone: '999000111', role: 'EMPLOYEE' }
  ]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [currency, setCurrency] = useState<Currency>(SUPPORTED_CURRENCIES[0]);
  const [isAIConsultantOpen, setIsAIConsultantOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('DASHBOARD');

  const [newPatientData, setNewPatientData] = useState<Partial<Customer>>({
    name: '', dni: '', insuranceId: 'PART', phone: '', email: ''
  });

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('DASHBOARD');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleAddPatient = (patient: Customer) => {
    setCustomers(prev => [...prev, patient]);
  };

  const handleCompleteSale = (items: SaleItem[], insurance: InsurancePlan, customer?: Customer, prescription?: PrescriptionData) => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = subtotal * (insurance.coveragePercent / 100);
    const total = subtotal - discount;

    const newSale: SaleRecord = {
      id: `S${Date.now()}`,
      timestamp: new Date().toISOString(),
      items,
      total,
      customerId: customer?.id,
      customerName: customer?.name || 'Venta General',
      insuranceName: insurance.name,
      userId: currentUser?.id || 'unknown'
    };

    setSales(prev => [newSale, ...prev]);

    if (customer) {
      setCustomers(prev => prev.map(c => 
        c.id === customer.id 
          ? { ...c, history: [newSale.id, ...c.history] } 
          : c
      ));
    }

    const updatedMeds = medications.map(med => {
      const soldItemsForMed = items.filter(item => item.medication.id === med.id);
      if (soldItemsForMed.length > 0) {
        let newStockBoxes = med.stockBoxes;
        let newStockUnits = med.stockUnits;
        soldItemsForMed.forEach(soldItem => {
          if (soldItem.isFractional) {
            newStockUnits = Math.max(0, newStockUnits - soldItem.quantity);
          } else {
            newStockBoxes = Math.max(0, newStockBoxes - soldItem.quantity);
          }
        });
        return { ...med, stockBoxes: newStockBoxes, stockUnits: newStockUnits };
      }
      return med;
    });
    setMedications(updatedMeds);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative overflow-hidden">
      {/* Sidebar - Desktop & Tablet */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-slate-900 flex-col shrink-0 transition-all duration-300 z-50 h-screen border-r border-white/5">
        <div className="p-8 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-2xl shrink-0 shadow-xl shadow-emerald-900/40">
              <HeartPulse className="text-white w-7 h-7" />
            </div>
            <span className="text-white font-black text-xl hidden md:block tracking-tight">FarmaSalud <span className="text-emerald-500 text-[10px] block uppercase font-bold tracking-widest">Enterprise ERP</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
          <NavButton active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<LayoutDashboard />} label="Dashboard" />
          <NavButton active={activeTab === 'POS'} onClick={() => setActiveTab('POS')} icon={<ShoppingCart />} label="Punto de Venta" />
          <NavButton active={activeTab === 'INVENTORY'} onClick={() => setActiveTab('INVENTORY')} icon={<Pill />} label="Inventario" />
          <NavButton active={activeTab === 'REPORTS'} onClick={() => setActiveTab('REPORTS')} icon={<BarChart3 />} label="Reportes" />
          <NavButton active={activeTab === 'CUSTOMERS'} onClick={() => setActiveTab('CUSTOMERS')} icon={<Users />} label="Pacientes" />
          {currentUser.role === 'ADMIN' && (
            <NavButton active={activeTab === 'STAFF'} onClick={() => setActiveTab('STAFF')} icon={<UserCog />} label="Personal" />
          )}
        </nav>

        <div className="p-6 mt-auto border-t border-white/5">
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-[1.5rem] mb-4 hidden md:flex">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-black text-lg">
              {currentUser.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm truncate">{currentUser.name}</p>
              <p className="text-emerald-500 text-[10px] uppercase font-black">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-rose-400 hover:bg-rose-400/10 transition-all font-bold group">
            <LogOut className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            <span className="hidden md:block">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pb-20 md:pb-0">
        <header className="h-16 md:h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 md:px-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-5 md:h-6 bg-emerald-500 rounded-full" />
            <h2 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Online</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
               <Globe className="w-3.5 h-3.5 text-emerald-600" />
               <span className="text-[10px] font-black text-emerald-700 uppercase">{currency.code} ({currency.symbol})</span>
            </div>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={handleLogout} className="md:hidden p-2 text-rose-400">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'DASHBOARD' && <Dashboard medications={medications} currencySymbol={currency.symbol} />}
          {activeTab === 'POS' && <PosSystem medications={medications} customers={customers} onCompleteSale={handleCompleteSale} onAddPatient={handleAddPatient} currencySymbol={currency.symbol} />}
          {activeTab === 'INVENTORY' && (
             <InventoryManager 
                medications={medications} 
                onAdd={(m) => setMedications([...medications, m])} 
                onUpdate={(m) => setMedications(medications.map(x => x.id === m.id ? m : x))} 
                onDelete={(id) => setMedications(medications.filter(x => x.id !== id))}
                currencySymbol={currency.symbol}
              />
          )}
          {activeTab === 'REPORTS' && <Reports sales={sales} currencySymbol={currency.symbol} />}
          {activeTab === 'CUSTOMERS' && (
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800">Gestión de Pacientes</h2>
                <button 
                  onClick={() => {
                    setNewPatientData({ name: '', dni: '', insuranceId: 'PART', phone: '', email: '' });
                    setIsNewPatientModalOpen(true);
                  }}
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
          )}
          {activeTab === 'STAFF' && currentUser.role === 'ADMIN' && (
            <StaffManager 
              staff={staff} 
              onAdd={(u) => setStaff([...staff, u])} 
              onUpdate={(u) => setStaff(staff.map(x => x.id === u.id ? u : x))} 
              onDelete={(id) => setStaff(staff.filter(x => x.id !== id))}
              sales={sales}
            />
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 flex justify-around items-center h-16 px-4 z-[90]">
        <MobileTabButton active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<LayoutDashboard />} />
        <MobileTabButton active={activeTab === 'POS'} onClick={() => setActiveTab('POS')} icon={<ShoppingCart />} />
        <MobileTabButton active={activeTab === 'INVENTORY'} onClick={() => setActiveTab('INVENTORY')} icon={<Pill />} />
        <MobileTabButton active={activeTab === 'REPORTS'} onClick={() => setActiveTab('REPORTS')} icon={<BarChart3 />} />
        <MobileTabButton active={activeTab === 'CUSTOMERS'} onClick={() => setActiveTab('CUSTOMERS')} icon={<Users />} />
        {currentUser.role === 'ADMIN' && (
          <MobileTabButton active={activeTab === 'STAFF'} onClick={() => setActiveTab('STAFF')} icon={<UserCog />} />
        )}
      </nav>

      {/* Floating AI Button - Adjusted for Mobile Nav */}
      {!isAIConsultantOpen && (
        <button 
          onClick={() => setIsAIConsultantOpen(true)}
          className="fixed bottom-20 md:bottom-8 right-6 md:right-8 z-[100] group flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white p-4 lg:px-6 lg:py-4 rounded-full lg:rounded-2xl shadow-2xl shadow-emerald-600/40 transition-all duration-300 hover:scale-105 active:scale-95 animate-bounce-subtle"
        >
          <div className="relative">
            <Bot className="w-6 h-6 md:w-7 md:h-7" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full animate-ping" />
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Consultas</p>
            <p className="text-sm font-bold">Asistente IA</p>
          </div>
          <Sparkles className="w-4 h-4 text-emerald-300 hidden lg:block" />
        </button>
      )}

      {/* AI Consultant Modal Overlay */}
      {isAIConsultantOpen && currentUser && (
        <AIConsultant 
          onClose={() => setIsAIConsultantOpen(false)} 
          medications={medications}
          sales={sales}
          customers={customers}
          currentUser={currentUser}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black">Configuración</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Regional & Moneda</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Símbolo de Moneda</label>
                <div className="grid grid-cols-2 gap-3">
                  {SUPPORTED_CURRENCIES.map(curr => (
                    <button
                      key={curr.code}
                      onClick={() => {
                        setCurrency(curr);
                        setIsSettingsOpen(false);
                      }}
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
            </div>
          </div>
        </div>
      )}

      {/* New Patient Modal */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
              <h2 className="text-2xl font-black">Nuevo Paciente</h2>
              <button onClick={() => setIsNewPatientModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const patient: Customer = {
                  id: `C${Date.now()}`,
                  name: newPatientData.name || '',
                  dni: newPatientData.dni || '',
                  insuranceId: newPatientData.insuranceId || 'PART',
                  phone: newPatientData.phone,
                  email: newPatientData.email,
                  history: []
                };
                handleAddPatient(patient);
                setIsNewPatientModalOpen(false);
              }}
              className="p-8 space-y-4"
            >
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input 
                  type="text" required
                  value={newPatientData.name}
                  onChange={e => setNewPatientData({...newPatientData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DNI / Identificación</label>
                <input 
                  type="text" required
                  value={newPatientData.dni}
                  onChange={e => setNewPatientData({...newPatientData, dni: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                <input 
                  type="text"
                  value={newPatientData.phone}
                  onChange={e => setNewPatientData({...newPatientData, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
                />
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/30 text-sm uppercase tracking-widest mt-4">
                Registrar Paciente
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 ${active ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40 translate-x-1' : 'text-slate-400 hover:text-white hover:bg-white/5 hover:translate-x-1'}`}
  >
    {React.cloneElement(icon, { className: 'w-6 h-6 shrink-0' })}
    <span className="font-bold hidden md:block text-sm tracking-tight">{label}</span>
  </button>
);

const MobileTabButton = ({ active, onClick, icon }: any) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-xl transition-all ${active ? 'text-emerald-500' : 'text-slate-500'}`}
  >
    {React.cloneElement(icon, { className: 'w-6 h-6' })}
  </button>
);

export default App;
