
import { Medication, Category, InsurancePlan, Customer, SaleRecord, Currency } from './types';

export const INSURANCE_PLANS: InsurancePlan[] = [
  { id: 'PART', name: 'Particular (Sin Seguro)', coveragePercent: 0 },
  { id: 'OSDE', name: 'OSDE 210', coveragePercent: 40 },
  { id: 'SWISS', name: 'Swiss Medical', coveragePercent: 50 },
  { id: 'PAMI', name: 'PAMI Jubilados', coveragePercent: 80 }
];

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'BOB', symbol: 'Bs', name: 'Boliviano' },
  { code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
  { code: 'ARS', symbol: 'ARS$', name: 'Peso Argentino' },
  { code: 'MXN', symbol: 'MXN$', name: 'Peso Mexicano' },
  { code: 'PEN', symbol: 'S/', name: 'Sol Peruano' },
  { code: 'CLP', symbol: 'CLP$', name: 'Peso Chileno' },
  { code: 'COP', symbol: 'COP$', name: 'Peso Colombiano' }
];

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'C1',
    name: 'Juan Pérez',
    dni: '12345678',
    insuranceId: 'OSDE',
    phone: '555-0101',
    email: 'juan.perez@email.com',
    history: ['S1']
  },
  {
    id: 'C2',
    name: 'María García',
    dni: '87654321',
    insuranceId: 'PAMI',
    phone: '555-0202',
    email: 'maria.garcia@email.com',
    history: []
  }
];

export const MOCK_MEDICATIONS: Medication[] = [
  {
    id: '1',
    name: 'Ibuprofeno 600mg',
    genericName: 'Ibuprofeno',
    laboratory: 'Bayer',
    description: 'Analgésico potente.',
    priceBox: 1200,
    priceUnit: 70,
    unitsPerBox: 20,
    category: Category.PAINKILLERS,
    imageUrl: 'https://picsum.photos/seed/ibu/400/300',
    stockBoxes: 45,
    stockUnits: 12,
    isControlled: false,
    minStock: 10,
    batches: [
      { lotNumber: 'B-881', expiryDate: '2024-05-20', quantity: 20 },
      { lotNumber: 'B-902', expiryDate: '2025-10-12', quantity: 25 }
    ]
  },
  {
    id: '2',
    name: 'Amoxicilina 500 Duo',
    genericName: 'Amoxicilina',
    laboratory: 'Roemmers',
    description: 'Antibiótico de amplio espectro.',
    priceBox: 1800,
    priceUnit: 120,
    unitsPerBox: 16,
    category: Category.ANTIBIOTICS,
    imageUrl: 'https://picsum.photos/seed/amox/400/300',
    stockBoxes: 15,
    stockUnits: 4,
    isControlled: true,
    minStock: 5,
    batches: [
      { lotNumber: 'L-112', expiryDate: '2023-12-30', quantity: 15 }
    ]
  }
];
