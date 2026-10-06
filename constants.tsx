import { Medication, Category, InsurancePlan, Customer, SaleRecord, Currency, User, Supplier, Purchase, PharmacyInfo } from './types';

export const DEFAULT_PHARMACY_INFO: PharmacyInfo = {
  name: 'FARMACIA YIREH',
  commercialName: 'FARMACIA YIREH',
  nit: '1020304050',
  address: 'Av. Principal #100',
  phone: '71523456',
  city: 'La Paz - Bolivia',
  authorizationNumber: '29040011007'
};

export const DEFAULT_DISCOUNT_PLANS: InsurancePlan[] = [
  { id: 'NONE', name: 'Sin Descuento (0%)', coveragePercent: 0 },
  { id: 'CLI_FREQ', name: 'Cliente Frecuente (5%)', coveragePercent: 5 },
  { id: 'AMAYOR', name: 'Adulto Mayor (10%)', coveragePercent: 10 },
  { id: 'PROM', name: 'Promoción Especial (15%)', coveragePercent: 15 }
];

export const INSURANCE_PLANS: InsurancePlan[] = DEFAULT_DISCOUNT_PLANS;

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'BOB', symbol: 'Bs', name: 'Boliviano' },
  { code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
  { code: 'ARS', symbol: 'ARS$', name: 'Peso Argentino' },
  { code: 'MXN', symbol: 'MXN$', name: 'Peso Mexicano' },
  { code: 'PEN', symbol: 'S/', name: 'Sol Peruano' },
  { code: 'CLP', symbol: 'CLP$', name: 'Peso Chileno' },
  { code: 'COP', symbol: 'COP$', name: 'Peso Colombiano' }
];

// Datos demo eliminados para operación real limpia
export const MOCK_CUSTOMERS: Customer[] = [];

export const MOCK_MEDICATIONS: Medication[] = [];

export const MOCK_STAFF: User[] = [
  {
    id: '1',
    name: 'Administrador Principal',
    username: 'admin',
    password: 'admin',
    role: 'ADMIN',
    originalRole: 'ADMIN',
    assignedRegister: 'Caja 1',
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

export const MOCK_SUPPLIERS: Supplier[] = [];

export const MOCK_SALES: SaleRecord[] = [];

export const MOCK_PURCHASES: Purchase[] = [];
