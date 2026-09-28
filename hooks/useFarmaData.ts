
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
  SUPABASE_SETUP_SQL 
} from '@/services/supabaseService';
import { 
  broadcastSyncEvent, 
  startAutoSyncListener, 
  getSyncRoom, 
  setSyncRoom,
  getClientInstanceId 
} from '@/services/autoSyncService';

export const useFarmaData = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('FARMA_USER');
    return saved ? JSON.parse(saved) : null;
  });

  const [pharmacyInfo, setPharmacyInfo] = useState<PharmacyInfo>(() => {
    const saved = localStorage.getItem('FARMA_PHARMACY_INFO');
    return saved ? JSON.parse(saved) : DEFAULT_PHARMACY_INFO;
  });

  const [discountPlans, setDiscountPlans] = useState<InsurancePlan[]>(() => {
    const saved = localStorage.getItem('FARMA_DISCOUNTS');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_DISCOUNT_PLANS;
  });

  const sortAlphabetical = (list: Medication[]): Medication[] => {
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  };

  const [medications, setMedications] = useState<Medication[]>(() => {
    const saved = localStorage.getItem('FARMA_MEDS');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return sortAlphabetical(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    }
    return sortAlphabetical(MOCK_MEDICATIONS);
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('FARMA_CUSTOMERS');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return MOCK_CUSTOMERS;
  });

  const [staff, setStaff] = useState<User[]>(() => {
    const saved = localStorage.getItem('FARMA_STAFF');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return MOCK_STAFF;
  });

  const [sales, setSales] = useState<SaleRecord[]>(() => {
    const saved = localStorage.getItem('FARMA_SALES');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return MOCK_SALES;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('FARMA_SUPPLIERS');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return MOCK_SUPPLIERS;
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('FARMA_PURCHASES');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return MOCK_PURCHASES;
  });

  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('FARMA_CURRENCY');
    return saved ? JSON.parse(saved) : SUPPORTED_CURRENCIES[0];
  });

  const [activeCashRegister, setActiveCashRegister] = useState<'Caja 1' | 'Caja 2'>(() => {
    return (localStorage.getItem('FARMA_ACTIVE_REGISTER') as 'Caja 1' | 'Caja 2') || 'Caja 1';
  });

  const [businessQR, setBusinessQR] = useState<string | null>(() => localStorage.getItem('FARMA_QR'));
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('FARMA_DARK_MODE') === 'true';
  });

  // Cloud Sync (Supabase - Optional custom cloud database)
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(() => {
    const { url, anonKey } = getStoredSupabaseConfig();
    return isValidSupabaseConfig(url, anonKey);
  });
  const [cloudLastSync, setCloudLastSync] = useState<string | null>(() => localStorage.getItem('FARMA_SUPABASE_LAST_SYNC'));
  const [isSyncingWithCloud, setIsSyncingWithCloud] = useState<boolean>(false);
  const isApplyingRemoteRef = useRef(false);
  const isInitialLoadedRef = useRef(false);

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
          case 'REQUEST_SYNC': {
            if (medications.length > 0) {
              broadcastSyncEvent('PROVIDE_SYNC', {
                medications,
                customers,
                sales,
                purchases,
                suppliers,
                pharmacyInfo,
                discountPlans
              });
            }
            break;
          }
          case 'PROVIDE_SYNC': {
            if (msg.payload) {
              if (Array.isArray(msg.payload.medications) && msg.payload.medications.length > 0) {
                const sorted = sortAlphabetical(msg.payload.medications);
                setMedications(sorted);
                try { localStorage.setItem('FARMA_MEDS', JSON.stringify(sorted)); } catch {}
              }
              if (Array.isArray(msg.payload.customers) && msg.payload.customers.length > 0) {
                setCustomers(msg.payload.customers);
                try { localStorage.setItem('FARMA_CUSTOMERS', JSON.stringify(msg.payload.customers)); } catch {}
              }
              if (Array.isArray(msg.payload.sales) && msg.payload.sales.length > 0) {
                setSales(msg.payload.sales);
                try { localStorage.setItem('FARMA_SALES', JSON.stringify(msg.payload.sales)); } catch {}
              }
              if (Array.isArray(msg.payload.purchases) && msg.payload.purchases.length > 0) {
                setPurchases(msg.payload.purchases);
                try { localStorage.setItem('FARMA_PURCHASES', JSON.stringify(msg.payload.purchases)); } catch {}
              }
              if (Array.isArray(msg.payload.suppliers) && msg.payload.suppliers.length > 0) {
                setSuppliers(msg.payload.suppliers);
                try { localStorage.setItem('FARMA_SUPPLIERS', JSON.stringify(msg.payload.suppliers)); } catch {}
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

  // Initial Cloud Load and Realtime Subscription
  useEffect(() => {
    const { url, anonKey } = getStoredSupabaseConfig();
    if (isValidSupabaseConfig(url, anonKey)) {
      setIsSyncingWithCloud(true);
      pullAllFromSupabase().then(res => {
        if (res.success && res.data && Object.keys(res.data).length > 0) {
          isApplyingRemoteRef.current = true;
          if (res.data.medications && Array.isArray(res.data.medications)) {
            setMedications(sortAlphabetical(res.data.medications));
          }
          if (res.data.customers && Array.isArray(res.data.customers)) {
            setCustomers(res.data.customers);
          }
          if (res.data.sales && Array.isArray(res.data.sales)) {
            setSales(res.data.sales);
          }
          if (res.data.suppliers && Array.isArray(res.data.suppliers)) {
            setSuppliers(res.data.suppliers);
          }
          if (res.data.purchases && Array.isArray(res.data.purchases)) {
            setPurchases(res.data.purchases);
          }
          if (res.data.pharmacyInfo) {
            setPharmacyInfo(res.data.pharmacyInfo);
          }
          if (res.data.discountPlans && Array.isArray(res.data.discountPlans)) {
            setDiscountPlans(res.data.discountPlans);
          }
          setCloudLastSync(new Date().toLocaleTimeString('es-ES'));
          setTimeout(() => {
            isApplyingRemoteRef.current = false;
            isInitialLoadedRef.current = true;
          }, 350);
        } else {
          isInitialLoadedRef.current = true;
        }
      }).catch(err => {
        console.warn('Error al sincronizar con Supabase al iniciar:', err);
        isInitialLoadedRef.current = true;
      }).finally(() => {
        setIsSyncingWithCloud(false);
      });

      const unsub = subscribeToRealtimeChanges((collectionId, data) => {
        isApplyingRemoteRef.current = true;
        if (collectionId === 'medications' && Array.isArray(data)) {
          setMedications(sortAlphabetical(data));
        } else if (collectionId === 'customers' && Array.isArray(data)) {
          setCustomers(data);
        } else if (collectionId === 'sales' && Array.isArray(data)) {
          setSales(data);
        } else if (collectionId === 'purchases' && Array.isArray(data)) {
          setPurchases(data);
        } else if (collectionId === 'suppliers' && Array.isArray(data)) {
          setSuppliers(data);
        } else if (collectionId === 'pharmacyInfo') {
          setPharmacyInfo(data);
        } else if (collectionId === 'discountPlans' && Array.isArray(data)) {
          setDiscountPlans(data);
        }
        setCloudLastSync(new Date().toLocaleTimeString('es-ES'));
        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 350);
      });

      return () => {
        unsub();
      };
    } else {
      isInitialLoadedRef.current = true;
    }
  }, []);

  // Persistence Effects (Local Storage + Cloud Auto-Push)
  useEffect(() => {
    localStorage.setItem('FARMA_ACTIVE_REGISTER', activeCashRegister);
  }, [activeCashRegister]);

  useEffect(() => {
    localStorage.setItem('FARMA_MEDS', JSON.stringify(medications));
    if (isInitialLoadedRef.current && !isApplyingRemoteRef.current && isCloudConnected) {
      pushCollectionToSupabase('medications', medications);
    }
  }, [medications, isCloudConnected]);

  useEffect(() => {
    localStorage.setItem('FARMA_CUSTOMERS', JSON.stringify(customers));
    if (isInitialLoadedRef.current && !isApplyingRemoteRef.current && isCloudConnected) {
      pushCollectionToSupabase('customers', customers);
    }
  }, [customers, isCloudConnected]);

  useEffect(() => {
    localStorage.setItem('FARMA_STAFF', JSON.stringify(staff));
    if (isInitialLoadedRef.current && !isApplyingRemoteRef.current && isCloudConnected) {
      pushCollectionToSupabase('staff', staff);
    }
  }, [staff, isCloudConnected]);

  useEffect(() => {
    localStorage.setItem('FARMA_SALES', JSON.stringify(sales));
    if (isInitialLoadedRef.current && !isApplyingRemoteRef.current && isCloudConnected) {
      pushCollectionToSupabase('sales', sales);
    }
  }, [sales, isCloudConnected]);

  useEffect(() => {
    localStorage.setItem('FARMA_SUPPLIERS', JSON.stringify(suppliers));
    if (isInitialLoadedRef.current && !isApplyingRemoteRef.current && isCloudConnected) {
      pushCollectionToSupabase('suppliers', suppliers);
    }
  }, [suppliers, isCloudConnected]);

  useEffect(() => {
    localStorage.setItem('FARMA_PURCHASES', JSON.stringify(purchases));
    if (isInitialLoadedRef.current && !isApplyingRemoteRef.current && isCloudConnected) {
      pushCollectionToSupabase('purchases', purchases);
    }
  }, [purchases, isCloudConnected]);

  useEffect(() => {
    localStorage.setItem('FARMA_CURRENCY', JSON.stringify(currency));
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('FARMA_PHARMACY_INFO', JSON.stringify(pharmacyInfo));
    if (isInitialLoadedRef.current && !isApplyingRemoteRef.current && isCloudConnected) {
      pushCollectionToSupabase('pharmacyInfo', pharmacyInfo);
    }
  }, [pharmacyInfo, isCloudConnected]);

  useEffect(() => {
    localStorage.setItem('FARMA_DISCOUNTS', JSON.stringify(discountPlans));
    if (isInitialLoadedRef.current && !isApplyingRemoteRef.current && isCloudConnected) {
      pushCollectionToSupabase('discountPlans', discountPlans);
    }
  }, [discountPlans, isCloudConnected]);

  useEffect(() => {
    localStorage.setItem('FARMA_DARK_MODE', darkMode.toString());
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
    localStorage.setItem('FARMA_USER', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('FARMA_USER');
  };

  const handleSwitchRole = (role: 'ADMIN' | 'EMPLOYEE' | 'PHARMACIST') => {
    if (!currentUser) return;
    const updatedUser: User = { ...currentUser, role };
    setCurrentUser(updatedUser);
    localStorage.setItem('FARMA_USER', JSON.stringify(updatedUser));
  };

  const handleAddPatient = (patient: Customer) => {
    setCustomers(prev => [...prev, patient]);
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
        const newStockBoxes = Math.floor(totalUnits / med.unitsPerBox);
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

    // Auto-broadcast instant stock reduction and sale to the other 3 computers
    broadcastSyncEvent('SALE_COMPLETED', { sale: newSale, updatedMeds });

    return newSale;
  };

  const handleRegisterPurchase = (purchase: Purchase) => {
    setPurchases(prev => [purchase, ...prev]);
    
    // Update inventory
    const updatedMeds = medications.map(med => {
      const item = purchase.items.find(i => i.medicationId === med.id);
      if (item) {
        const newBatches = [...med.batches];
        const batchIdx = newBatches.findIndex(b => b.lotNumber === item.lotNumber);
        
        const addedUnits = item.quantity * med.unitsPerBox;
        
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
          stockBoxes: Math.floor(totalUnits / med.unitsPerBox),
          stockUnits: totalUnits
        };
      }
      return med;
    });
    setMedications(updatedMeds);

    // Auto-broadcast purchase and new stock to all 4 computers
    broadcastSyncEvent('PURCHASE_REGISTERED', { purchase, updatedMeds });
  };

  const handleAddMedication = (newMed: Medication) => {
    setMedications(prev => {
      const updated = sortAlphabetical([...prev, newMed]);
      localStorage.setItem('FARMA_MEDS', JSON.stringify(updated));
      broadcastSyncEvent('MED_UPDATED', { updatedMeds: updated });
      return updated;
    });
  };

  const handleUpdateMedication = (updatedMed: Medication) => {
    setMedications(prev => {
      const updated = prev.map(m => m.id === updatedMed.id ? updatedMed : m);
      localStorage.setItem('FARMA_MEDS', JSON.stringify(updated));
      broadcastSyncEvent('MED_UPDATED', { updatedMeds: updated });
      return updated;
    });
  };

  const handleDeleteMedication = (id: string) => {
    setMedications(prev => {
      const updated = prev.filter(m => m.id !== id);
      try {
        localStorage.setItem('FARMA_MEDS', JSON.stringify(updated));
      } catch {}
      broadcastSyncEvent('MED_DELETED', { deletedId: id, updatedMeds: updated });
      return updated;
    });
  };

  const handleBatchAddMeds = (newMeds: Medication[]) => {
    setMedications(prev => {
      const merged = sortAlphabetical([...prev, ...newMeds]);
      localStorage.setItem('FARMA_MEDS', JSON.stringify(merged));
      broadcastSyncEvent('MEDS_BATCH_ADDED', { newMeds: merged });
      return merged;
    });
  };

  const handleReplaceMeds = (newMeds: Medication[]) => {
    const sorted = sortAlphabetical(newMeds);
    setMedications(sorted);
    localStorage.setItem('FARMA_MEDS', JSON.stringify(sorted));
    broadcastSyncEvent('MEDS_BATCH_ADDED', { newMeds: sorted });
  };

  const handleClearDemoData = () => {
    setMedications([]);
    setCustomers([]);
    setSales([]);
    setPurchases([]);
    localStorage.setItem('FARMA_MEDS', JSON.stringify([]));
    localStorage.setItem('FARMA_CUSTOMERS', JSON.stringify([]));
    localStorage.setItem('FARMA_SALES', JSON.stringify([]));
    localStorage.setItem('FARMA_PURCHASES', JSON.stringify([]));
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
