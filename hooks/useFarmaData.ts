
import { useState, useEffect } from 'react';
import { Medication, User, SaleItem, InsurancePlan, Customer, SaleRecord, Currency, Supplier, Purchase } from '@/types';
import { MOCK_MEDICATIONS, MOCK_CUSTOMERS, SUPPORTED_CURRENCIES, MOCK_STAFF, MOCK_SUPPLIERS, MOCK_SALES, MOCK_PURCHASES } from '@/constants';

export const useFarmaData = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('FARMA_USER');
    return saved ? JSON.parse(saved) : null;
  });

  const [medications, setMedications] = useState<Medication[]>(() => {
    const saved = localStorage.getItem('FARMA_MEDS');
    return saved ? JSON.parse(saved) : MOCK_MEDICATIONS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('FARMA_CUSTOMERS');
    return saved ? JSON.parse(saved) : MOCK_CUSTOMERS;
  });

  const [staff, setStaff] = useState<User[]>(() => {
    const saved = localStorage.getItem('FARMA_STAFF');
    return saved ? JSON.parse(saved) : MOCK_STAFF;
  });

  const [sales, setSales] = useState<SaleRecord[]>(() => {
    const saved = localStorage.getItem('FARMA_SALES');
    return saved ? JSON.parse(saved) : MOCK_SALES;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('FARMA_SUPPLIERS');
    return saved ? JSON.parse(saved) : MOCK_SUPPLIERS;
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('FARMA_PURCHASES');
    return saved ? JSON.parse(saved) : MOCK_PURCHASES;
  });

  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('FARMA_CURRENCY');
    return saved ? JSON.parse(saved) : SUPPORTED_CURRENCIES[0];
  });

  const [businessQR, setBusinessQR] = useState<string | null>(() => localStorage.getItem('FARMA_QR'));
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('FARMA_DARK_MODE') === 'true';
  });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('FARMA_MEDS', JSON.stringify(medications));
  }, [medications]);

  useEffect(() => {
    localStorage.setItem('FARMA_CUSTOMERS', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('FARMA_STAFF', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('FARMA_SALES', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('FARMA_SUPPLIERS', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('FARMA_PURCHASES', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('FARMA_CURRENCY', JSON.stringify(currency));
  }, [currency]);

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
  };

  const handleCompleteSale = (items: SaleItem[], insurance: InsurancePlan, paymentMethod: any, customer?: Customer): SaleRecord => {
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
      userId: currentUser?.id || 'unknown',
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
  };

  const resetToMockData = () => {
    localStorage.removeItem('FARMA_MEDS');
    localStorage.removeItem('FARMA_CUSTOMERS');
    localStorage.removeItem('FARMA_STAFF');
    localStorage.removeItem('FARMA_SALES');
    localStorage.removeItem('FARMA_SUPPLIERS');
    localStorage.removeItem('FARMA_PURCHASES');
    
    setMedications(MOCK_MEDICATIONS);
    setCustomers(MOCK_CUSTOMERS);
    setStaff(MOCK_STAFF);
    setSales(MOCK_SALES);
    setSuppliers(MOCK_SUPPLIERS);
    setPurchases(MOCK_PURCHASES);
  };

  return {
    currentUser,
    medications,
    customers,
    staff,
    sales,
    suppliers,
    purchases,
    currency,
    businessQR,
    isOnline,
    darkMode,
    setMedications,
    setCustomers,
    setStaff,
    setSales,
    setSuppliers,
    setPurchases,
    setCurrency,
    setBusinessQR,
    setDarkMode,
    handleLogin,
    handleLogout,
    handleSwitchRole,
    handleAddPatient,
    handleCompleteSale,
    handleRegisterPurchase,
    resetToMockData
  };
};
