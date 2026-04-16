
import { useState, useEffect } from 'react';
import { Medication, User, SaleItem, InsurancePlan, Customer, SaleRecord, Currency, Supplier } from '../types';
import { MOCK_MEDICATIONS, MOCK_CUSTOMERS, SUPPORTED_CURRENCIES } from '../constants';

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
    return saved ? JSON.parse(saved) : [
      { id: 'U1', name: 'Admin Principal', username: 'admin', password: 'admin', phone: '999888777', role: 'ADMIN' },
      { id: 'U2', name: 'Empleado Demo', username: 'empleado', password: '123', phone: '999000111', role: 'EMPLOYEE' }
    ];
  });

  const [sales, setSales] = useState<SaleRecord[]>(() => {
    const saved = localStorage.getItem('FARMA_SALES');
    return saved ? JSON.parse(saved) : [];
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('FARMA_SUPPLIERS');
    return saved ? JSON.parse(saved) : [
      { id: 'PROV-1', name: 'Droguería Inti', phone: '22233344', ci: '1234567 LP', address: 'Av. Blanco Galindo Km 5', status: 'active', registrationDate: '15/04/2026', lastUpdate: '15/04/2026' },
      { id: 'PROV-2', name: 'LUBRAX', phone: '74504589', ci: 'N/A', address: 'N/A', status: 'active', registrationDate: '08/04/2026', lastUpdate: '08/04/2026' }
    ];
  });

  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('FARMA_CURRENCY');
    return saved ? JSON.parse(saved) : SUPPORTED_CURRENCIES[0];
  });

  const [businessQR, setBusinessQR] = useState<string | null>(() => localStorage.getItem('FARMA_QR'));
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
    localStorage.setItem('FARMA_CURRENCY', JSON.stringify(currency));
  }, [currency]);

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
    return newSale;
  };

  return {
    currentUser,
    medications,
    customers,
    staff,
    sales,
    suppliers,
    currency,
    businessQR,
    isOnline,
    setMedications,
    setCustomers,
    setStaff,
    setSales,
    setSuppliers,
    setCurrency,
    setBusinessQR,
    handleLogin,
    handleLogout,
    handleAddPatient,
    handleCompleteSale
  };
};
