
import { useState, useEffect, useRef } from 'react';
import { Medication, User, SaleItem, InsurancePlan, Customer, SaleRecord, Currency, Supplier, Purchase, PharmacyInfo, PrescriptionData } from '@/types';
import { MOCK_MEDICATIONS, MOCK_CUSTOMERS, SUPPORTED_CURRENCIES, MOCK_STAFF, MOCK_SUPPLIERS, MOCK_SALES, MOCK_PURCHASES, DEFAULT_PHARMACY_INFO, DEFAULT_DISCOUNT_PLANS } from '@/constants';
import { 
  getStoredSupabaseConfig, 
  isValidSupabaseConfig,
  saveSupabaseCredentials, 
  removeSupabaseCredentials, 
  testSupabaseConnection, 
  pushCollectionToSupabase, 
  pullAllFromSupabase, 
  subscribeToRealtimeChanges,
  checkSupabaseTableReady,
  SUPABASE_SETUP_SQL 
} from '@/services/supabaseService';
import { 
  broadcastSyncEvent, 
  startAutoSyncListener, 
  getSyncRoom, 
  setSyncRoom,
  getClientInstanceId 
} from '@/services/autoSyncService';

const DEFAULT_INITIAL_STAFF: User[] = [
  {
    id: '1',
    name: 'Administrador Principal',
    username: 'admin',
    password: 'admin',
    role: 'ADMIN',
    originalRole: 'ADMIN',
    permissions: {
      allowedSections: ['DASHBOARD', 'POS', 'INVENTORY', 'REPORTS', 'CUSTOMERS', 'SUPPLIERS', 'PURCHASES', 'STAFF'],
      canEditInventory: true
    }
  },
  {
    id: 'U_JOSUE_BALBOA',
    name: 'Josue Balboa',
    username: 'josue',
    password: '123',
    role: 'EMPLOYEE',
    originalRole: 'EMPLOYEE',
    customRoleName: 'Cajero / Ventas',
    assignedRegister: 'Caja 1',
    permissions: {
      allowedSections: ['POS', 'INVENTORY', 'CUSTOMERS'],
      canEditInventory: false
    }
  }
];

const LEGACY_DEMO_MED_IDS = new Set(['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15']);
const LEGACY_DEMO_CUST_IDS = new Set(['C1','C2','C3','C4','C5','C6','C7','C8','C9','C10','C11','C12','C13','C14','C15']);
const LEGACY_DEMO_SALE_IDS = new Set(['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12','S13','S14','S15']);
const LEGACY_DEMO_SUPP_IDS = new Set(['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11','P12','P13','P14','P15']);
const LEGACY_DEMO_STAFF_IDS = new Set(['U2','U3','U4','U5','U6','U7','U8','U9','U10','U11','U12','U13','U14','U15']);

const cleanDemoMeds = (list: Medication[]): Medication[] =>
  Array.isArray(list) ? list.filter(m => m && !LEGACY_DEMO_MED_IDS.has(String(m.id))) : [];
const cleanDemoCustomers = (list: Customer[]): Customer[] =>
  Array.isArray(list) ? list.filter(c => c && !LEGACY_DEMO_CUST_IDS.has(String(c.id))) : [];
const cleanDemoSales = (list: SaleRecord[]): SaleRecord[] =>
  Array.isArray(list) ? list.filter(s => s && !LEGACY_DEMO_SALE_IDS.has(String(s.id))) : [];
const cleanDemoSuppliers = (list: Supplier[]): Supplier[] =>
  Array.isArray(list) ? list.filter(s => s && !LEGACY_DEMO_SUPP_IDS.has(String(s.id))) : [];
const cleanDemoPurchases = (list: Purchase[]): Purchase[] =>
  Array.isArray(list) ? list.filter(p => p && !LEGACY_DEMO_SUPP_IDS.has(String(p.id))) : [];
const cleanDemoStaff = (list: User[]): User[] =>
  Array.isArray(list) ? list.filter(u => u && !LEGACY_DEMO_STAFF_IDS.has(String(u.id))) : [];

export const useFarmaData = () => {
  // Limpieza automática definitiva de cualquier dato demo o residuo anterior en el navegador
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('FARMA_CLEAN_SLATE_V5') !== 'true') {
      localStorage.setItem('FARMA_MEDS', JSON.stringify([]));
      localStorage.setItem('FARMA_CUSTOMERS', JSON.stringify([]));
      localStorage.setItem('FARMA_SALES', JSON.stringify([]));
      localStorage.setItem('FARMA_SUPPLIERS', JSON.stringify([]));
      localStorage.setItem('FARMA_PURCHASES', JSON.stringify([]));
      localStorage.setItem('FARMA_STAFF', JSON.stringify(DEFAULT_INITIAL_STAFF));
      localStorage.setItem('FARMA_CLEAN_SLATE_V5', 'true');
    }
  } catch {}

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('FARMA_USER');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.username) return parsed;
      }
    } catch {}
    return null;
  });

  const [pharmacyInfo, setPharmacyInfo] = useState<PharmacyInfo>(() => {
    try {
      const saved = localStorage.getItem('FARMA_PHARMACY_INFO');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return { ...DEFAULT_PHARMACY_INFO, ...parsed };
      }
    } catch {}
    return DEFAULT_PHARMACY_INFO;
  });

  const [discountPlans, setDiscountPlans] = useState<InsurancePlan[]>(() => {
    try {
      const saved = localStorage.getItem('FARMA_DISCOUNTS');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_DISCOUNT_PLANS;
  });

  const sortAlphabetical = (list: Medication[]): Medication[] => {
    if (!Array.isArray(list)) return [];
    return [...cleanDemoMeds(list)]
      .filter((m): m is Medication => Boolean(m && typeof m === 'object'))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));
  };

  const [medications, setMedications] = useState<Medication[]>(() => {
    try {
      const saved = localStorage.getItem('FARMA_MEDS');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return sortAlphabetical(cleanDemoMeds(parsed));
        }
      }
    } catch {}
    return [];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('FARMA_CUSTOMERS');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return cleanDemoCustomers(parsed);
      }
    } catch {}
    return [];
  });

  const [staff, setStaff] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('FARMA_STAFF');
      if (saved !== null) {
        const parsed = cleanDemoStaff(JSON.parse(saved));
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_INITIAL_STAFF;
  });

  const [sales, setSales] = useState<SaleRecord[]>(() => {
    try {
      const saved = localStorage.getItem('FARMA_SALES');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return cleanDemoSales(parsed);
      }
    } catch {}
    return [];
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem('FARMA_SUPPLIERS');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return cleanDemoSuppliers(parsed);
      }
    } catch {}
    return [];
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    try {
      const saved = localStorage.getItem('FARMA_PURCHASES');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return cleanDemoPurchases(parsed);
      }
    } catch {}
    return [];
  });

  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem('FARMA_CURRENCY');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.symbol) return parsed;
      }
    } catch {}
    return SUPPORTED_CURRENCIES[0];
  });

  const [activeCashRegister, setActiveCashRegister] = useState<'Caja 1' | 'Caja 2'>(() => {
    try {
      return (localStorage.getItem('FARMA_ACTIVE_REGISTER') as 'Caja 1' | 'Caja 2') || 'Caja 1';
    } catch {
      return 'Caja 1';
    }
  });

  const [businessQR, setBusinessQR] = useState<string | null>(() => {
    try { return localStorage.getItem('FARMA_QR'); } catch { return null; }
  });
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem('FARMA_DARK_MODE') === 'true'; } catch { return false; }
  });

  // Cloud Sync (Supabase - Optional custom cloud database)
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(() => {
    const { url, anonKey } = getStoredSupabaseConfig();
    return isValidSupabaseConfig(url, anonKey);
  });
  const [cloudLastSync, setCloudLastSync] = useState<string | null>(() => {
    try { return localStorage.getItem('FARMA_SUPABASE_LAST_SYNC'); } catch { return null; }
  });
  const [isSyncingWithCloud, setIsSyncingWithCloud] = useState<boolean>(false);
  const isApplyingRemoteRef = useRef(false);
  const isInitialLoadedRef = useRef(false);
  const lastMutationAtRef = useRef<number>(0);

  // 100% AUTOMATIC REAL-TIME SYNC FOR 4 COMPUTERS (Zero Setup, Zero Database Configuration)
  const [isAutoSyncConnected, setIsAutoSyncConnected] = useState<boolean>(true);
  const [autoSyncRoom, setAutoSyncRoomState] = useState<string>(() => getSyncRoom());
  const [autoSyncLastTime, setAutoSyncLastTime] = useState<string>(() => new Date().toLocaleTimeString('es-ES'));
  const isHandlingRemoteSyncRef = useRef(false);

  // Automatic Real-Time Listener for the 4 Computers
  useEffect(() => {
    const unsub = startAutoSyncListener((msg) => {
      isHandlingRemoteSyncRef.current = true;
      try {
        switch (msg.type) {
          case 'SALE_COMPLETED': {
            if (msg.payload?.sale) {
              setSales(prev => {
                if (prev.some(s => s.id === msg.payload.sale.id)) return prev;
                const nextSales = [msg.payload.sale, ...prev];
                try { localStorage.setItem('FARMA_SALES', JSON.stringify(nextSales)); } catch {}
                return nextSales;
              });
            }
            if (msg.payload?.updatedMeds && Array.isArray(msg.payload.updatedMeds)) {
              const sorted = sortAlphabetical(msg.payload.updatedMeds);
              setMedications(sorted);
              try { localStorage.setItem('FARMA_MEDS', JSON.stringify(sorted)); } catch {}
            }
            break;
          }
          case 'PURCHASE_REGISTERED': {
            if (msg.payload?.purchase) {
              setPurchases(prev => {
                if (prev.some(p => p.id === msg.payload.purchase.id)) return prev;
                const nextPurchases = [msg.payload.purchase, ...prev];
                try { localStorage.setItem('FARMA_PURCHASES', JSON.stringify(nextPurchases)); } catch {}
                return nextPurchases;
              });
            }
            if (msg.payload?.updatedMeds && Array.isArray(msg.payload.updatedMeds)) {
              const sorted = sortAlphabetical(msg.payload.updatedMeds);
              setMedications(sorted);
              try { localStorage.setItem('FARMA_MEDS', JSON.stringify(sorted)); } catch {}
            }
            break;
          }
          case 'CUSTOMER_ADDED': {
            if (msg.payload?.customer) {
              setCustomers(prev => {
                if (prev.some(c => c.id === msg.payload.customer.id)) return prev;
                const nextCustomers = [...prev, msg.payload.customer];
                try { localStorage.setItem('FARMA_CUSTOMERS', JSON.stringify(nextCustomers)); } catch {}
                return nextCustomers;
              });
            }
            break;
          }
          case 'MED_DELETED': {
            if (msg.payload?.updatedMeds && Array.isArray(msg.payload.updatedMeds)) {
              const sorted = sortAlphabetical(msg.payload.updatedMeds);
              setMedications(sorted);
              try { localStorage.setItem('FARMA_MEDS', JSON.stringify(sorted)); } catch {}
            } else if (msg.payload?.deletedId) {
              setMedications(prev => {
                const filtered = prev.filter(m => m.id !== msg.payload.deletedId);
                try { localStorage.setItem('FARMA_MEDS', JSON.stringify(filtered)); } catch {}
                return filtered;
              });
            }
            break;
          }
          case 'MED_UPDATED':
          case 'MEDS_BATCH_ADDED': {
            if (msg.payload?.updatedMeds && Array.isArray(msg.payload.updatedMeds)) {
              const sorted = sortAlphabetical(msg.payload.updatedMeds);
              setMedications(sorted);
              try { localStorage.setItem('FARMA_MEDS', JSON.stringify(sorted)); } catch {}
            } else if (msg.payload?.newMeds && Array.isArray(msg.payload.newMeds)) {
              const sorted = sortAlphabetical(msg.payload.newMeds);
              setMedications(sorted);
              try { localStorage.setItem('FARMA_MEDS', JSON.stringify(sorted)); } catch {}
            }
            break;
          }
          case 'DISCOUNTS_UPDATED': {
            if (msg.payload?.discountPlans && Array.isArray(msg.payload.discountPlans)) {
              setDiscountPlans(msg.payload.discountPlans);
              try { localStorage.setItem('FARMA_DISCOUNTS', JSON.stringify(msg.payload.discountPlans)); } catch {}
            }
            break;
          }
          case 'PHARMACY_INFO_UPDATED': {
            if (msg.payload?.pharmacyInfo) {
              setPharmacyInfo(msg.payload.pharmacyInfo);
              try { localStorage.setItem('FARMA_INFO', JSON.stringify(msg.payload.pharmacyInfo)); } catch {}
            }
            break;
          }
          case 'CLEAR_DEMO': {
            setMedications([]);
            setCustomers([]);
            setSales([]);
            setPurchases([]);
            try {
              localStorage.removeItem('FARMA_MEDS');
              localStorage.removeItem('FARMA_CUSTOMERS');
              localStorage.removeItem('FARMA_SALES');
              localStorage.removeItem('FARMA_PURCHASES');
            } catch {}
            break;
          }
          case 'STAFF_UPDATED': {
            if (msg.payload?.staff && Array.isArray(msg.payload.staff)) {
              setStaff(msg.payload.staff);
              try { localStorage.setItem('FARMA_STAFF', JSON.stringify(msg.payload.staff)); } catch {}
            }
            break;
          }
          case 'REQUEST_SYNC': {
            broadcastSyncEvent('PROVIDE_SYNC', {
              medications,
              customers,
              sales,
              purchases,
              suppliers,
              staff,
              pharmacyInfo,
              discountPlans
            });
            break;
          }
          case 'PROVIDE_SYNC': {
            if (msg.payload) {
              if (Array.isArray(msg.payload.staff) && msg.payload.staff.length > 0) {
                const cleanedStaff = cleanDemoStaff(msg.payload.staff);
                setStaff(cleanedStaff);
                try { localStorage.setItem('FARMA_STAFF', JSON.stringify(cleanedStaff)); } catch {}
              }
              if (Array.isArray(msg.payload.medications)) {
                const sorted = sortAlphabetical(msg.payload.medications);
                setMedications(sorted);
                try { localStorage.setItem('FARMA_MEDS', JSON.stringify(sorted)); } catch {}
              }
              if (Array.isArray(msg.payload.customers)) {
                const cleanedCust = cleanDemoCustomers(msg.payload.customers);
                setCustomers(cleanedCust);
                try { localStorage.setItem('FARMA_CUSTOMERS', JSON.stringify(cleanedCust)); } catch {}
              }
              if (Array.isArray(msg.payload.sales)) {
                const cleanedSales = cleanDemoSales(msg.payload.sales);
                setSales(cleanedSales);
                try { localStorage.setItem('FARMA_SALES', JSON.stringify(cleanedSales)); } catch {}
              }
              if (Array.isArray(msg.payload.purchases)) {
                const cleanedPurchases = cleanDemoPurchases(msg.payload.purchases);
                setPurchases(cleanedPurchases);
                try { localStorage.setItem('FARMA_PURCHASES', JSON.stringify(cleanedPurchases)); } catch {}
              }
              if (Array.isArray(msg.payload.suppliers)) {
                const cleanedSuppliers = cleanDemoSuppliers(msg.payload.suppliers);
                setSuppliers(cleanedSuppliers);
                try { localStorage.setItem('FARMA_SUPPLIERS', JSON.stringify(cleanedSuppliers)); } catch {}
              }
              if (msg.payload.pharmacyInfo) {
                setPharmacyInfo(msg.payload.pharmacyInfo);
                try { localStorage.setItem('FARMA_INFO', JSON.stringify(msg.payload.pharmacyInfo)); } catch {}
              }
              if (Array.isArray(msg.payload.discountPlans) && msg.payload.discountPlans.length > 0) {
                setDiscountPlans(msg.payload.discountPlans);
                try { localStorage.setItem('FARMA_DISCOUNTS', JSON.stringify(msg.payload.discountPlans)); } catch {}
              }
            }
            break;
          }
        }
        setAutoSyncLastTime(new Date().toLocaleTimeString('es-ES'));
      } finally {
        setTimeout(() => {
          isHandlingRemoteSyncRef.current = false;
        }, 300);
      }
    }, (connected) => {
      setIsAutoSyncConnected(connected);
    });

    return () => {
      unsub();
    };
  }, [medications, customers, sales, purchases, suppliers, pharmacyInfo, discountPlans]);

  const [isCloudTableReady, setIsCloudTableReady] = useState<boolean | null>(null);

  // Initial Cloud Load and Realtime Subscription (Universal: works on PC and Mobile without setup)
  useEffect(() => {
    setIsSyncingWithCloud(true);

    pullAllFromSupabase().then(res => {
      if (res.success && res.data && Object.keys(res.data).length > 0) {
        if (Date.now() - lastMutationAtRef.current < 8000) {
          isInitialLoadedRef.current = true;
          return;
        }
        isApplyingRemoteRef.current = true;
        if (Array.isArray(res.data.medications) && res.data.medications.length > 0) {
          const cleaned = sortAlphabetical(res.data.medications);
          setMedications(cleaned);
          try { localStorage.setItem('FARMA_MEDS', JSON.stringify(cleaned)); } catch {}
        }
        if (Array.isArray(res.data.customers) && res.data.customers.length > 0) {
          const cleaned = cleanDemoCustomers(res.data.customers);
          setCustomers(cleaned);
          try { localStorage.setItem('FARMA_CUSTOMERS', JSON.stringify(cleaned)); } catch {}
        }
        if (Array.isArray(res.data.sales) && res.data.sales.length > 0) {
          const cleaned = cleanDemoSales(res.data.sales);
          setSales(cleaned);
          try { localStorage.setItem('FARMA_SALES', JSON.stringify(cleaned)); } catch {}
        }
        if (Array.isArray(res.data.suppliers) && res.data.suppliers.length > 0) {
          const cleaned = cleanDemoSuppliers(res.data.suppliers);
          setSuppliers(cleaned);
          try { localStorage.setItem('FARMA_SUPPLIERS', JSON.stringify(cleaned)); } catch {}
        }
        if (Array.isArray(res.data.purchases) && res.data.purchases.length > 0) {
          const cleaned = cleanDemoPurchases(res.data.purchases);
          setPurchases(cleaned);
          try { localStorage.setItem('FARMA_PURCHASES', JSON.stringify(cleaned)); } catch {}
        }
        if (Array.isArray(res.data.staff) && res.data.staff.length > 0) {
          const cleaned = cleanDemoStaff(res.data.staff);
          setStaff(cleaned);
          try { localStorage.setItem('FARMA_STAFF', JSON.stringify(cleaned)); } catch {}
        }
        if (res.data.pharmacyInfo) {
          setPharmacyInfo(res.data.pharmacyInfo);
        }
        if (Array.isArray(res.data.discountPlans) && res.data.discountPlans.length > 0) {
          setDiscountPlans(res.data.discountPlans);
        }
        setCloudLastSync(new Date().toLocaleTimeString('es-ES'));
        setIsCloudConnected(true);
        setIsCloudTableReady(true);
        setTimeout(() => {
          isApplyingRemoteRef.current = false;
          isInitialLoadedRef.current = true;
        }, 350);
      } else {
        isInitialLoadedRef.current = true;
      }
    }).catch(err => {
      console.warn('Error al sincronizar con la nube al iniciar:', err);
      isInitialLoadedRef.current = true;
    }).finally(() => {
      setIsSyncingWithCloud(false);
    });

    const unsub = subscribeToRealtimeChanges(
      (collectionId, data) => {
        isApplyingRemoteRef.current = true;
        if (collectionId === 'medications' && Array.isArray(data)) {
          setMedications(sortAlphabetical(data));
        } else if (collectionId === 'customers' && Array.isArray(data)) {
          setCustomers(cleanDemoCustomers(data));
        } else if (collectionId === 'sales' && Array.isArray(data)) {
          setSales(cleanDemoSales(data));
        } else if (collectionId === 'purchases' && Array.isArray(data)) {
          setPurchases(cleanDemoPurchases(data));
        } else if (collectionId === 'suppliers' && Array.isArray(data)) {
          setSuppliers(cleanDemoSuppliers(data));
        } else if (collectionId === 'staff' && Array.isArray(data)) {
          setStaff(cleanDemoStaff(data));
        } else if (collectionId === 'pharmacyInfo') {
          setPharmacyInfo(data);
        } else if (collectionId === 'discountPlans' && Array.isArray(data)) {
          setDiscountPlans(data);
        }
        setCloudLastSync(new Date().toLocaleTimeString('es-ES'));
        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 350);
      },
      (broadcastType, broadcastPayload) => {
        // Recepción instantánea vía WebSocket (sin necesidad de tablas)
        isApplyingRemoteRef.current = true;
        try {
          if (broadcastType === 'MED_UPDATED' && broadcastPayload?.updatedMeds) {
            setMedications(sortAlphabetical(broadcastPayload.updatedMeds));
          } else if (broadcastType === 'MED_DELETED') {
            if (broadcastPayload?.updatedMeds) {
              setMedications(sortAlphabetical(broadcastPayload.updatedMeds));
            } else if (broadcastPayload?.deletedId) {
              setMedications(prev => prev.filter(m => m.id !== broadcastPayload.deletedId));
            }
          } else if (broadcastType === 'SALE_COMPLETED') {
            if (broadcastPayload?.sale) {
              setSales(prev => prev.some(s => s.id === broadcastPayload.sale.id) ? prev : [broadcastPayload.sale, ...prev]);
            }
            if (broadcastPayload?.updatedMeds) {
              setMedications(sortAlphabetical(broadcastPayload.updatedMeds));
            }
          } else if (broadcastType === 'PURCHASE_REGISTERED') {
            if (broadcastPayload?.purchase) {
              setPurchases(prev => prev.some(p => p.id === broadcastPayload.purchase.id) ? prev : [broadcastPayload.purchase, ...prev]);
            }
            if (broadcastPayload?.updatedMeds) {
              setMedications(sortAlphabetical(broadcastPayload.updatedMeds));
            }
          } else if (broadcastType === 'CUSTOMER_ADDED' && broadcastPayload?.customer) {
            setCustomers(prev => prev.some(c => c.id === broadcastPayload.customer.id) ? prev : [...prev, broadcastPayload.customer]);
          } else if (broadcastType === 'STAFF_UPDATED' && broadcastPayload?.staff) {
            setStaff(broadcastPayload.staff);
          } else if (broadcastType === 'CLEAR_DEMO') {
            setMedications([]);
            setCustomers([]);
            setSales([]);
            setPurchases([]);
          }
        } finally {
          setTimeout(() => {
            isApplyingRemoteRef.current = false;
          }, 300);
        }
      }
    );

    // Sondeo periódico cada 4.5 segundos para sincronizar automáticamente entre PC y celular
    const pollTimer = setInterval(() => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        !isApplyingRemoteRef.current &&
        Date.now() - lastMutationAtRef.current > 8000
      ) {
        pullAllFromSupabase().then(res => {
          if (res.success && res.data && Date.now() - lastMutationAtRef.current > 8000) {
            if (Array.isArray(res.data.staff) && res.data.staff.length > 0) {
              const cleaned = cleanDemoStaff(res.data.staff);
              setStaff(prev => {
                const s1 = JSON.stringify(prev);
                const s2 = JSON.stringify(cleaned);
                return s1 !== s2 ? cleaned : prev;
              });
            }
            if (Array.isArray(res.data.medications) && res.data.medications.length > 0) {
              const cleaned = sortAlphabetical(res.data.medications);
              setMedications(prev => {
                const s1 = JSON.stringify(prev);
                const s2 = JSON.stringify(cleaned);
                return s1 !== s2 ? cleaned : prev;
              });
            }
            if (Array.isArray(res.data.sales) && res.data.sales.length > 0) {
              const cleaned = cleanDemoSales(res.data.sales);
              setSales(prev => {
                const s1 = JSON.stringify(prev);
                const s2 = JSON.stringify(cleaned);
                return s1 !== s2 ? cleaned : prev;
              });
            }
            if (Array.isArray(res.data.customers) && res.data.customers.length > 0) {
              const cleaned = cleanDemoCustomers(res.data.customers);
              setCustomers(prev => {
                const s1 = JSON.stringify(prev);
                const s2 = JSON.stringify(cleaned);
                return s1 !== s2 ? cleaned : prev;
              });
            }
            if (Array.isArray(res.data.suppliers) && res.data.suppliers.length > 0) {
              const cleaned = cleanDemoSuppliers(res.data.suppliers);
              setSuppliers(prev => {
                const s1 = JSON.stringify(prev);
                const s2 = JSON.stringify(cleaned);
                return s1 !== s2 ? cleaned : prev;
              });
            }
            if (Array.isArray(res.data.purchases) && res.data.purchases.length > 0) {
              const cleaned = cleanDemoPurchases(res.data.purchases);
              setPurchases(prev => {
                const s1 = JSON.stringify(prev);
                const s2 = JSON.stringify(cleaned);
                return s1 !== s2 ? cleaned : prev;
              });
            }
          }
        }).catch(() => {});
      }
    }, 4500);

    return () => {
      unsub();
      clearInterval(pollTimer);
    };
  }, []);

  // Persistence Effects (Local Storage + Cloud Auto-Push garantizado)
  useEffect(() => {
    try { localStorage.setItem('FARMA_ACTIVE_REGISTER', activeCashRegister); } catch {}
  }, [activeCashRegister]);

  const isFirstMountMeds = useRef(true);
  useEffect(() => {
    try { localStorage.setItem('FARMA_MEDS', JSON.stringify(medications)); } catch {}
    if (isFirstMountMeds.current) { isFirstMountMeds.current = false; return; }
    if (!isApplyingRemoteRef.current) {
      lastMutationAtRef.current = Date.now();
      pushCollectionToSupabase('medications', medications);
    }
  }, [medications]);

  const isFirstMountCustomers = useRef(true);
  useEffect(() => {
    try { localStorage.setItem('FARMA_CUSTOMERS', JSON.stringify(customers)); } catch {}
    if (isFirstMountCustomers.current) { isFirstMountCustomers.current = false; return; }
    if (!isApplyingRemoteRef.current) {
      lastMutationAtRef.current = Date.now();
      pushCollectionToSupabase('customers', customers);
    }
  }, [customers]);

  const isFirstMountStaff = useRef(true);
  useEffect(() => {
    try { localStorage.setItem('FARMA_STAFF', JSON.stringify(staff)); } catch {}
    if (isFirstMountStaff.current) { isFirstMountStaff.current = false; return; }
    if (!isApplyingRemoteRef.current) {
      lastMutationAtRef.current = Date.now();
      broadcastSyncEvent('STAFF_UPDATED', { staff });
      pushCollectionToSupabase('staff', staff);
    }
  }, [staff]);

  const isFirstMountSales = useRef(true);
  useEffect(() => {
    try { localStorage.setItem('FARMA_SALES', JSON.stringify(sales)); } catch {}
    if (isFirstMountSales.current) { isFirstMountSales.current = false; return; }
    if (!isApplyingRemoteRef.current) {
      lastMutationAtRef.current = Date.now();
      pushCollectionToSupabase('sales', sales);
    }
  }, [sales]);

  const isFirstMountSuppliers = useRef(true);
  useEffect(() => {
    try { localStorage.setItem('FARMA_SUPPLIERS', JSON.stringify(suppliers)); } catch {}
    if (isFirstMountSuppliers.current) { isFirstMountSuppliers.current = false; return; }
    if (!isApplyingRemoteRef.current) {
      lastMutationAtRef.current = Date.now();
      pushCollectionToSupabase('suppliers', suppliers);
    }
  }, [suppliers]);

  const isFirstMountPurchases = useRef(true);
  useEffect(() => {
    try { localStorage.setItem('FARMA_PURCHASES', JSON.stringify(purchases)); } catch {}
    if (isFirstMountPurchases.current) { isFirstMountPurchases.current = false; return; }
    if (!isApplyingRemoteRef.current) {
      lastMutationAtRef.current = Date.now();
      pushCollectionToSupabase('purchases', purchases);
    }
  }, [purchases]);

  useEffect(() => {
    try { localStorage.setItem('FARMA_CURRENCY', JSON.stringify(currency)); } catch {}
  }, [currency]);

  const isFirstMountInfo = useRef(true);
  useEffect(() => {
    try { localStorage.setItem('FARMA_PHARMACY_INFO', JSON.stringify(pharmacyInfo)); } catch {}
    if (isFirstMountInfo.current) { isFirstMountInfo.current = false; return; }
    if (!isApplyingRemoteRef.current) {
      lastMutationAtRef.current = Date.now();
      pushCollectionToSupabase('pharmacyInfo', pharmacyInfo);
    }
  }, [pharmacyInfo]);

  const isFirstMountDiscounts = useRef(true);
  useEffect(() => {
    try { localStorage.setItem('FARMA_DISCOUNTS', JSON.stringify(discountPlans)); } catch {}
    if (isFirstMountDiscounts.current) { isFirstMountDiscounts.current = false; return; }
    if (!isApplyingRemoteRef.current) {
      lastMutationAtRef.current = Date.now();
      pushCollectionToSupabase('discountPlans', discountPlans);
    }
  }, [discountPlans]);

  useEffect(() => {
    try { localStorage.setItem('FARMA_DARK_MODE', darkMode.toString()); } catch {}
  }, [darkMode]);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    try { localStorage.setItem('FARMA_USER', JSON.stringify(user)); } catch {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try { localStorage.removeItem('FARMA_USER'); } catch {}
  };

  const handleSwitchRole = (role: 'ADMIN' | 'EMPLOYEE' | 'PHARMACIST') => {
    if (!currentUser) return;
    const updatedUser: User = { ...currentUser, role };
    setCurrentUser(updatedUser);
    try { localStorage.setItem('FARMA_USER', JSON.stringify(updatedUser)); } catch {}
  };

  const handleAddPatient = (patient: Customer) => {
    lastMutationAtRef.current = Date.now();
    isInitialLoadedRef.current = true;
    setCustomers(prev => {
      const updated = [...prev, patient];
      try { localStorage.setItem('FARMA_CUSTOMERS', JSON.stringify(updated)); } catch {}
      pushCollectionToSupabase('customers', updated);
      return updated;
    });
    broadcastSyncEvent('CUSTOMER_ADDED', { customer: patient });
  };

  const handleCompleteSale = (
    items: SaleItem[], 
    insurance: InsurancePlan, 
    paymentMethod: any, 
    customer?: Customer,
    prescription?: PrescriptionData,
    documentType: 'FACTURA' | 'RECIBO' = 'FACTURA',
    clientNitCi?: string,
    qrVerified?: boolean,
    cashRegisterParam?: 'Caja 1' | 'Caja 2'
  ): SaleRecord => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = subtotal * (insurance.coveragePercent / 100);
    const total = subtotal - discount;

    const assignedOrActiveRegister = cashRegisterParam || activeCashRegister || (currentUser?.assignedRegister) || 'Caja 1';
    const cashierName = currentUser?.name || currentUser?.username || 'Cajero';

    const newSale: SaleRecord = {
      id: `S${Date.now()}`,
      timestamp: new Date().toISOString(),
      items,
      total,
      customerId: customer?.id,
      customerName: customer?.name || 'Venta General',
      clientNit: clientNitCi || customer?.dni || '0',
      documentType,
      qrVerified: paymentMethod === 'QR' ? (qrVerified ?? true) : undefined,
      insuranceName: insurance.name,
      userId: currentUser?.id || 'unknown',
      cashierName,
      cashRegister: assignedOrActiveRegister,
      paymentMethod
    };

    lastMutationAtRef.current = Date.now();
    isInitialLoadedRef.current = true;
    setSales(prev => {
      const updatedSales = [newSale, ...prev];
      try { localStorage.setItem('FARMA_SALES', JSON.stringify(updatedSales)); } catch {}
      pushCollectionToSupabase('sales', updatedSales);
      return updatedSales;
    });

    if (customer) {
      setCustomers(prev => {
        const updatedCustomers = prev.map(c => 
          c.id === customer.id 
            ? { ...c, history: [newSale.id, ...c.history] } 
            : c
        );
        try { localStorage.setItem('FARMA_CUSTOMERS', JSON.stringify(updatedCustomers)); } catch {}
        pushCollectionToSupabase('customers', updatedCustomers);
        return updatedCustomers;
      });
    }

    const updatedMeds = medications.map(med => {
      const soldItemsForMed = items.filter(item => item.medication.id === med.id);
      if (soldItemsForMed.length > 0) {
        let newBatches = [...med.batches];
        
        soldItemsForMed.forEach(soldItem => {
          const batchIndex = newBatches.findIndex(b => b.lotNumber === soldItem.selectedBatch);
          if (batchIndex !== -1) {
            const quantityInUnits = soldItem.isFractional ? soldItem.quantity : soldItem.quantity * med.unitsPerBox;
            newBatches[batchIndex] = {
              ...newBatches[batchIndex],
              quantity: Math.max(0, newBatches[batchIndex].quantity - quantityInUnits)
            };
          }
        });

        const totalUnits = newBatches.reduce((sum, b) => sum + b.quantity, 0);
        const isUnitMed = Boolean(med.isUnitOnly || med.unitsPerBox === 1);
        const newStockBoxes = isUnitMed ? totalUnits : Math.floor(totalUnits / (med.unitsPerBox || 1));
        const newStockUnits = totalUnits;

        return { 
          ...med, 
          batches: newBatches,
          stockBoxes: newStockBoxes,
          stockUnits: newStockUnits
        };
      }
      return med;
    });
    setMedications(updatedMeds);
    try { localStorage.setItem('FARMA_MEDS', JSON.stringify(updatedMeds)); } catch {}
    pushCollectionToSupabase('medications', updatedMeds);

    // Auto-broadcast instant stock reduction and sale to the other 3 computers
    broadcastSyncEvent('SALE_COMPLETED', { sale: newSale, updatedMeds });

    return newSale;
  };

  const handleRegisterPurchase = (purchase: Purchase) => {
    lastMutationAtRef.current = Date.now();
    isInitialLoadedRef.current = true;
    setPurchases(prev => {
      const updatedPurchases = [purchase, ...prev];
      try { localStorage.setItem('FARMA_PURCHASES', JSON.stringify(updatedPurchases)); } catch {}
      pushCollectionToSupabase('purchases', updatedPurchases);
      return updatedPurchases;
    });
    
    // Update inventory
    const updatedMeds = medications.map(med => {
      const item = purchase.items.find(i => i.medicationId === med.id);
      if (item) {
        const newBatches = [...med.batches];
        const batchIdx = newBatches.findIndex(b => b.lotNumber === item.lotNumber);
        const isUnitMed = Boolean(med.isUnitOnly || med.unitsPerBox === 1);
        const addedUnits = (item.isUnitPurchase || isUnitMed) ? item.quantity : item.quantity * (med.unitsPerBox || 1);
        
        if (batchIdx !== -1) {
          newBatches[batchIdx] = {
            ...newBatches[batchIdx],
            quantity: newBatches[batchIdx].quantity + addedUnits,
            expiryDate: item.expiryDate
          };
        } else {
          newBatches.push({
            lotNumber: item.lotNumber,
            expiryDate: item.expiryDate,
            quantity: addedUnits
          });
        }

        const totalUnits = newBatches.reduce((sum, b) => sum + b.quantity, 0);
        return {
          ...med,
          batches: newBatches,
          stockBoxes: isUnitMed ? totalUnits : Math.floor(totalUnits / (med.unitsPerBox || 1)),
          stockUnits: totalUnits
        };
      }
      return med;
    });
    setMedications(updatedMeds);
    try { localStorage.setItem('FARMA_MEDS', JSON.stringify(updatedMeds)); } catch {}
    pushCollectionToSupabase('medications', updatedMeds);

    // Auto-broadcast purchase and new stock to all 4 computers
    broadcastSyncEvent('PURCHASE_REGISTERED', { purchase, updatedMeds });
  };

  const handleAddMedication = (newMed: Medication) => {
    lastMutationAtRef.current = Date.now();
    isInitialLoadedRef.current = true;
    setMedications(prev => {
      const updated = sortAlphabetical([...prev, newMed]);
      try { localStorage.setItem('FARMA_MEDS', JSON.stringify(updated)); } catch {}
      pushCollectionToSupabase('medications', updated);
      broadcastSyncEvent('MED_UPDATED', { updatedMeds: updated });
      return updated;
    });
  };

  const handleUpdateMedication = (updatedMed: Medication) => {
    lastMutationAtRef.current = Date.now();
    isInitialLoadedRef.current = true;
    setMedications(prev => {
      const updated = prev.map(m => m.id === updatedMed.id ? updatedMed : m);
      try { localStorage.setItem('FARMA_MEDS', JSON.stringify(updated)); } catch {}
      pushCollectionToSupabase('medications', updated);
      broadcastSyncEvent('MED_UPDATED', { updatedMeds: updated });
      return updated;
    });
  };

  const handleDeleteMedication = (id: string) => {
    lastMutationAtRef.current = Date.now();
    isInitialLoadedRef.current = true;
    setMedications(prev => {
      const updated = prev.filter(m => m.id !== id);
      try { localStorage.setItem('FARMA_MEDS', JSON.stringify(updated)); } catch {}
      pushCollectionToSupabase('medications', updated);
      broadcastSyncEvent('MED_DELETED', { deletedId: id, updatedMeds: updated });
      return updated;
    });
  };

  const handleBatchAddMeds = (newMeds: Medication[]) => {
    lastMutationAtRef.current = Date.now();
    isInitialLoadedRef.current = true;
    setMedications(prev => {
      const merged = sortAlphabetical([...prev, ...newMeds]);
      try { localStorage.setItem('FARMA_MEDS', JSON.stringify(merged)); } catch {}
      pushCollectionToSupabase('medications', merged);
      broadcastSyncEvent('MEDS_BATCH_ADDED', { newMeds: merged });
      return merged;
    });
  };

  const handleReplaceMeds = (newMeds: Medication[]) => {
    lastMutationAtRef.current = Date.now();
    isInitialLoadedRef.current = true;
    const sorted = sortAlphabetical(newMeds);
    setMedications(sorted);
    try { localStorage.setItem('FARMA_MEDS', JSON.stringify(sorted)); } catch {}
    pushCollectionToSupabase('medications', sorted);
    broadcastSyncEvent('MEDS_BATCH_ADDED', { newMeds: sorted });
  };

  const handleClearDemoData = () => {
    setMedications([]);
    setCustomers([]);
    setSales([]);
    setPurchases([]);
    setSuppliers([]);
    localStorage.setItem('FARMA_MEDS', JSON.stringify([]));
    localStorage.setItem('FARMA_CUSTOMERS', JSON.stringify([]));
    localStorage.setItem('FARMA_SALES', JSON.stringify([]));
    localStorage.setItem('FARMA_PURCHASES', JSON.stringify([]));
    localStorage.setItem('FARMA_SUPPLIERS', JSON.stringify([]));
    pushCollectionToSupabase('medications', []);
    pushCollectionToSupabase('customers', []);
    pushCollectionToSupabase('sales', []);
    pushCollectionToSupabase('purchases', []);
    pushCollectionToSupabase('suppliers', []);
    broadcastSyncEvent('CLEAR_DEMO', {});
  };

  const handleClearAllInventory = () => {
    setMedications([]);
    localStorage.setItem('FARMA_MEDS', JSON.stringify([]));
    broadcastSyncEvent('MEDS_BATCH_ADDED', { newMeds: [] });
  };

  const handleExportFullBackup = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      system: 'FarmaPOS - Farmacia Yireh (SoftPlus)',
      version: '1.0',
      medications,
      customers,
      staff,
      sales,
      suppliers,
      purchases,
      pharmacyInfo,
      discountPlans,
      currency,
      businessQR
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FarmaPOS_Yireh_Respaldo_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFullBackup = (importedData: any) => {
    if (!importedData || typeof importedData !== 'object') {
      throw new Error('Archivo de respaldo no válido.');
    }
    if (Array.isArray(importedData.medications)) {
      const sorted = sortAlphabetical(importedData.medications);
      setMedications(sorted);
      localStorage.setItem('FARMA_MEDS', JSON.stringify(sorted));
    }
    if (Array.isArray(importedData.customers)) {
      setCustomers(importedData.customers);
      localStorage.setItem('FARMA_CUSTOMERS', JSON.stringify(importedData.customers));
    }
    if (Array.isArray(importedData.staff)) {
      setStaff(importedData.staff);
      localStorage.setItem('FARMA_STAFF', JSON.stringify(importedData.staff));
    }
    if (Array.isArray(importedData.sales)) {
      setSales(importedData.sales);
      localStorage.setItem('FARMA_SALES', JSON.stringify(importedData.sales));
    }
    if (Array.isArray(importedData.suppliers)) {
      setSuppliers(importedData.suppliers);
      localStorage.setItem('FARMA_SUPPLIERS', JSON.stringify(importedData.suppliers));
    }
    if (Array.isArray(importedData.purchases)) {
      setPurchases(importedData.purchases);
      localStorage.setItem('FARMA_PURCHASES', JSON.stringify(importedData.purchases));
    }
    if (importedData.pharmacyInfo && typeof importedData.pharmacyInfo === 'object') {
      setPharmacyInfo(importedData.pharmacyInfo);
      localStorage.setItem('FARMA_PHARMACY_INFO', JSON.stringify(importedData.pharmacyInfo));
    }
    if (Array.isArray(importedData.discountPlans)) {
      setDiscountPlans(importedData.discountPlans);
      localStorage.setItem('FARMA_DISCOUNTS', JSON.stringify(importedData.discountPlans));
    }
    if (importedData.currency) {
      setCurrency(importedData.currency);
      localStorage.setItem('FARMA_CURRENCY', JSON.stringify(importedData.currency));
    }
    if (importedData.businessQR !== undefined) {
      setBusinessQR(importedData.businessQR);
      if (importedData.businessQR) {
        localStorage.setItem('FARMA_QR', importedData.businessQR);
      } else {
        localStorage.removeItem('FARMA_QR');
      }
    }
  };

  const handleUpdateDiscountPlans = (plans: InsurancePlan[]) => {
    setDiscountPlans(plans);
    localStorage.setItem('FARMA_DISCOUNTS', JSON.stringify(plans));
  };

  const handleAddDiscountPlan = (plan: Omit<InsurancePlan, 'id'>) => {
    const newPlan: InsurancePlan = {
      ...plan,
      id: 'DSC_' + Date.now().toString(36)
    };
    const updated = [...discountPlans, newPlan];
    setDiscountPlans(updated);
    localStorage.setItem('FARMA_DISCOUNTS', JSON.stringify(updated));
    return newPlan;
  };

  const handleDeleteDiscountPlan = (id: string) => {
    const updated = discountPlans.filter(p => p.id !== id);
    setDiscountPlans(updated);
    localStorage.setItem('FARMA_DISCOUNTS', JSON.stringify(updated));
  };

  const handleConnectCloud = async (url: string, anonKey: string) => {
    try {
      saveSupabaseCredentials(url, anonKey);
      setIsCloudConnected(true);
      return await handleManualCloudSync();
    } catch (err: any) {
      return { success: false, message: err.message || 'Error al conectar con Supabase.' };
    }
  };

  const handleDisconnectCloud = () => {
    removeSupabaseCredentials();
    setIsCloudConnected(false);
    setCloudLastSync(null);
  };

  const handleManualCloudSync = async () => {
    setIsSyncingWithCloud(true);
    try {
      await Promise.all([
        pushCollectionToSupabase('medications', medications),
        pushCollectionToSupabase('customers', customers),
        pushCollectionToSupabase('sales', sales),
        pushCollectionToSupabase('suppliers', suppliers),
        pushCollectionToSupabase('purchases', purchases),
        pushCollectionToSupabase('pharmacyInfo', pharmacyInfo),
        pushCollectionToSupabase('discountPlans', discountPlans)
      ]);
      const nowStr = new Date().toLocaleTimeString('es-ES');
      setCloudLastSync(nowStr);
      setIsCloudConnected(true);
      return { success: true, message: `Sincronización completa a las ${nowStr}.` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error al sincronizar con Supabase.' };
    } finally {
      setIsSyncingWithCloud(false);
    }
  };

  const handleTestCloudConnection = async (url: string, anonKey: string) => {
    return await testSupabaseConnection(url, anonKey);
  };

  const handleTriggerAutoSync = async () => {
    const ok = await broadcastSyncEvent('PROVIDE_SYNC', {
      medications,
      customers,
      sales,
      purchases,
      suppliers,
      pharmacyInfo,
      discountPlans
    });
    setAutoSyncLastTime(new Date().toLocaleTimeString('es-ES'));
    return {
      success: ok,
      message: ok ? '¡Datos transmitidos con éxito a todas las computadoras y celulares!' : 'No se pudo sincronizar. Revisa la conexión a internet.'
    };
  };

  const resetToMockData = () => {
    localStorage.removeItem('FARMA_MEDS');
    localStorage.removeItem('FARMA_CUSTOMERS');
    localStorage.removeItem('FARMA_STAFF');
    localStorage.removeItem('FARMA_SALES');
    localStorage.removeItem('FARMA_SUPPLIERS');
    localStorage.removeItem('FARMA_PURCHASES');
    localStorage.removeItem('FARMA_PHARMACY_INFO');
    localStorage.removeItem('FARMA_DISCOUNTS');
    
    setMedications(MOCK_MEDICATIONS);
    setCustomers(MOCK_CUSTOMERS);
    setStaff(MOCK_STAFF);
    setSales(MOCK_SALES);
    setSuppliers(MOCK_SUPPLIERS);
    setPurchases(MOCK_PURCHASES);
    setPharmacyInfo(DEFAULT_PHARMACY_INFO);
    setDiscountPlans(DEFAULT_DISCOUNT_PLANS);
  };

  return {
    currentUser,
    pharmacyInfo,
    medications,
    customers,
    staff,
    sales,
    suppliers,
    purchases,
    discountPlans,
    currency,
    activeCashRegister,
    businessQR,
    isOnline,
    darkMode,
    setPharmacyInfo,
    setMedications,
    setCustomers,
    setStaff,
    setSales,
    setSuppliers,
    setPurchases,
    setDiscountPlans: handleUpdateDiscountPlans,
    handleAddDiscountPlan,
    handleDeleteDiscountPlan,
    setCurrency,
    setActiveCashRegister,
    setBusinessQR,
    setDarkMode,
    handleLogin,
    handleLogout,
    handleSwitchRole,
    handleAddPatient,
    handleCompleteSale,
    handleRegisterPurchase,
    handleAddMedication,
    handleUpdateMedication,
    handleDeleteMedication,
    handleBatchAddMeds,
    handleReplaceMeds,
    handleClearDemoData,
    handleClearAllInventory,
    handleExportFullBackup,
    handleImportFullBackup,
    isCloudConnected,
    isCloudTableReady,
    checkSupabaseTableReady,
    cloudLastSync,
    isSyncingWithCloud,
    handleConnectCloud,
    handleDisconnectCloud,
    handleManualCloudSync,
    handleTestCloudConnection,
    isAutoSyncConnected,
    autoSyncRoom,
    autoSyncLastTime,
    handleTriggerAutoSync,
    resetToMockData
  };
};
