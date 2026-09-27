
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

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'C1', name: 'Carlos Condori', dni: '1234567 LP', insuranceId: 'CLI_FREQ', phone: '71523456', email: 'carlos.condori@email.com', history: ['S1'] },
  { id: 'C2', name: 'Ana Choque', dni: '8765432 LP', insuranceId: 'AMAYOR', phone: '72011223', email: 'ana.choque@email.com', history: [] },
  { id: 'C3', name: 'Luis Mamani', dni: '4567890 LP', insuranceId: 'NONE', phone: '73544556', email: 'luis.mamani@email.com', history: [] },
  { id: 'C4', name: 'Maria Quispe', dni: '3210987 LP', insuranceId: 'CLI_FREQ', phone: '74088990', email: 'maria.quispe@email.com', history: [] },
  { id: 'C5', name: 'Jorge Flores', dni: '6543210 LP', insuranceId: 'NONE', phone: '75566778', email: 'jorge.flores@email.com', history: [] },
  { id: 'C6', name: 'Elena Huanca', dni: '9876543 LP', insuranceId: 'AMAYOR', phone: '76033445', email: 'elena.huanca@email.com', history: [] },
  { id: 'C7', name: 'Roberto Ticona', dni: '1357924 LP', insuranceId: 'CLI_FREQ', phone: '77599001', email: 'roberto.ticona@email.com', history: [] },
  { id: 'C8', name: 'Sandra Vargas', dni: '2468013 LP', insuranceId: 'NONE', phone: '78011223', email: 'sandra.vargas@email.com', history: [] },
  { id: 'C9', name: 'Felix Apaza', dni: '5791357 LP', insuranceId: 'CLI_FREQ', phone: '79544556', email: 'felix.apaza@email.com', history: [] },
  { id: 'C10', name: 'Carmen Mendoza', dni: '8024680 LP', insuranceId: 'AMAYOR', phone: '61088990', email: 'carmen.mendoza@email.com', history: [] },
  { id: 'C11', name: 'Victor Villca', dni: '1111111 LP', insuranceId: 'NONE', phone: '62066778', email: 'victor.villca@email.com', history: [] },
  { id: 'C12', name: 'Juana Ramos', dni: '2222222 LP', insuranceId: 'AMAYOR', phone: '63033445', email: 'juana.ramos@email.com', history: [] },
  { id: 'C13', name: 'Angel Paco', dni: '3333333 LP', insuranceId: 'CLI_FREQ', phone: '64099001', email: 'angel.paco@email.com', history: [] },
  { id: 'C14', name: 'Silvia Calle', dni: '4444444 LP', insuranceId: 'NONE', phone: '65011223', email: 'silvia.calle@email.com', history: [] },
  { id: 'C15', name: 'Javier Blanco', dni: '5555555 LP', insuranceId: 'AMAYOR', phone: '66044556', email: 'javier.blanco@email.com', history: [] }
];

export const MOCK_MEDICATIONS: Medication[] = [
  {
    id: '1',
    name: 'Tapsin Antigripal',
    genericName: 'Paracetamol / Pseudoefedrina',
    laboratory: 'Maver',
    description: 'Para el alivio de los síntomas del resfrío y la gripe.',
    priceBox: 45,
    priceUnit: 2.5,
    unitsPerBox: 24,
    category: Category.OTHERS,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
    stockBoxes: 140,
    stockUnits: 3360,
    isControlled: false,
    minStock: 20,
    maxStock: 120, // Sobre stock
    batches: [
      { lotNumber: 'T-101', expiryDate: '2026-10-25', quantity: 1800 }, // Corto (aprox 33 días)
      { lotNumber: 'T-102', expiryDate: '2027-08-15', quantity: 1560 }  // Largo
    ]
  },
  {
    id: '2',
    name: 'Ibuprofeno 600mg Bago',
    genericName: 'Ibuprofeno',
    laboratory: 'Bago',
    description: 'Analgésico y antiinflamatorio.',
    priceBox: 60,
    priceUnit: 3,
    unitsPerBox: 20,
    category: Category.PAINKILLERS,
    imageUrl: 'https://images.unsplash.com/photo-1550572017-ed200f545dec?w=400&h=300&fit=crop',
    stockBoxes: 85,
    stockUnits: 1700,
    isControlled: false,
    minStock: 15,
    maxStock: 100, // Óptimo
    batches: [
      { lotNumber: 'B-201', expiryDate: '2026-05-10', quantity: 400 },  // Vencido
      { lotNumber: 'B-202', expiryDate: '2027-09-20', quantity: 1300 }  // Largo
    ]
  },
  {
    id: '3',
    name: 'Amoxicilina 500mg Inti',
    genericName: 'Amoxicilina Trihidrato',
    laboratory: 'Inti',
    description: 'Antibiótico bactericida de amplio espectro.',
    priceBox: 80,
    priceUnit: 5,
    unitsPerBox: 16,
    category: Category.ANTIBIOTICS,
    imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&h=300&fit=crop',
    stockBoxes: 8,
    stockUnits: 128,
    isControlled: true,
    minStock: 15, // Bajo stock crítico
    maxStock: 80,
    batches: [
      { lotNumber: 'I-303', expiryDate: '2026-11-15', quantity: 128 } // Corto (54 días)
    ]
  },
  {
    id: '4',
    name: 'Vitamina C Redoxon',
    genericName: 'Ácido Ascórbico 1000mg',
    laboratory: 'Bayer',
    description: 'Suplemento vitamínico efervescente.',
    priceBox: 35,
    priceUnit: 3.5,
    unitsPerBox: 10,
    category: Category.VITAMINS,
    imageUrl: 'https://images.unsplash.com/photo-1616671285433-28952086cb48?w=400&h=300&fit=crop',
    stockBoxes: 110,
    stockUnits: 1100,
    isControlled: false,
    minStock: 30,
    maxStock: 150, // Óptimo
    batches: [
      { lotNumber: 'V-404', expiryDate: '2028-01-10', quantity: 1100 } // Largo
    ]
  },
  {
    id: '5',
    name: 'Omeprazol 20mg Vita',
    genericName: 'Omeprazol',
    laboratory: 'Vita',
    description: 'Inhibidor de la bomba de protones para la acidez.',
    priceBox: 50,
    priceUnit: 2,
    unitsPerBox: 25,
    category: Category.DIGESTIVE,
    imageUrl: 'https://images.unsplash.com/photo-1626716493137-b67fe9501e76?w=400&h=300&fit=crop',
    stockBoxes: 5,
    stockUnits: 125,
    isControlled: false,
    minStock: 12, // Bajo stock
    maxStock: 80,
    batches: [
      { lotNumber: 'O-505', expiryDate: '2026-04-18', quantity: 125 } // Vencido
    ]
  },
  {
    id: '6',
    name: 'Diclofenaco 50mg Delta',
    genericName: 'Diclofenaco Sódico',
    laboratory: 'Delta',
    description: 'Antiinflamatorio no esteroideo.',
    priceBox: 40,
    priceUnit: 1.5,
    unitsPerBox: 30,
    category: Category.PAINKILLERS,
    imageUrl: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=400&h=300&fit=crop',
    stockBoxes: 90,
    stockUnits: 2700,
    isControlled: false,
    minStock: 20,
    maxStock: 120, // Óptimo
    batches: [
      { lotNumber: 'D-606', expiryDate: '2026-10-30', quantity: 900 },  // Corto (38 días)
      { lotNumber: 'D-607', expiryDate: '2027-11-20', quantity: 1800 }  // Largo
    ]
  },
  {
    id: '7',
    name: 'Aspirina 100mg Bayer',
    genericName: 'Ácido Acetilsalicílico',
    laboratory: 'Bayer',
    description: 'Analgésico y antiagregante plaquetario.',
    priceBox: 30,
    priceUnit: 1,
    unitsPerBox: 30,
    category: Category.PAINKILLERS,
    imageUrl: 'https://images.unsplash.com/photo-1550572017-ed200f545dec?w=400&h=300&fit=crop',
    stockBoxes: 150,
    stockUnits: 4500,
    isControlled: false,
    minStock: 40,
    maxStock: 130, // Sobre stock
    batches: [
      { lotNumber: 'A-707', expiryDate: '2027-06-30', quantity: 4500 } // Largo
    ]
  },
  {
    id: '8',
    name: 'Complejo B Bago',
    genericName: 'Vitaminas B1, B6, B12',
    laboratory: 'Bago',
    description: 'Multivitamínico para el sistema nervioso.',
    priceBox: 75,
    priceUnit: 4,
    unitsPerBox: 20,
    category: Category.VITAMINS,
    imageUrl: 'https://images.unsplash.com/photo-1584017945516-fa47c6142ace?w=400&h=300&fit=crop',
    stockBoxes: 4,
    stockUnits: 80,
    isControlled: false,
    minStock: 10, // Bajo stock
    maxStock: 60,
    batches: [
      { lotNumber: 'CB-808', expiryDate: '2026-06-18', quantity: 80 } // Vencido
    ]
  },
  {
    id: '9',
    name: 'Antalgina 500mg IFA',
    genericName: 'Metamizol Magnésico',
    laboratory: 'IFA',
    description: 'Analgésico y antipirético potente.',
    priceBox: 45,
    priceUnit: 1.5,
    unitsPerBox: 30,
    category: Category.PAINKILLERS,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
    stockBoxes: 65,
    stockUnits: 1950,
    isControlled: false,
    minStock: 25,
    maxStock: 90, // Óptimo
    batches: [
      { lotNumber: 'AN-909', expiryDate: '2027-02-12', quantity: 1950 } // Largo
    ]
  },
  {
    id: '10',
    name: 'Loratadina 10mg Alcos',
    genericName: 'Loratadina',
    laboratory: 'Alcos',
    description: 'Antihistamínico para alergias y rinitis.',
    priceBox: 35,
    priceUnit: 1.2,
    unitsPerBox: 30,
    category: Category.OTHERS,
    imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&h=300&fit=crop',
    stockBoxes: 45,
    stockUnits: 1350,
    isControlled: false,
    minStock: 15,
    maxStock: 70, // Óptimo
    batches: [
      { lotNumber: 'L-010', expiryDate: '2026-11-28', quantity: 1350 } // Corto (67 días)
    ]
  },
  {
    id: '11',
    name: 'Salbutamol Inhalador Glaxo',
    genericName: 'Salbutamol Sulfato',
    laboratory: 'Glaxo',
    description: 'Broncodilatador para el asma.',
    priceBox: 85,
    priceUnit: 85,
    unitsPerBox: 1,
    category: Category.OTHERS,
    imageUrl: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?w=400&h=300&fit=crop',
    stockBoxes: 3,
    stockUnits: 3,
    isControlled: true,
    minStock: 5, // Bajo stock
    maxStock: 40,
    batches: [
      { lotNumber: 'S-111', expiryDate: '2026-07-30', quantity: 3 } // Vencido
    ]
  },
  {
    id: '12',
    name: 'Metformina 850mg Chile',
    genericName: 'Metformina Clorhidrato',
    laboratory: 'Laboratorios Chile',
    description: 'Antidiabético oral para el control glucémico.',
    priceBox: 90,
    priceUnit: 3,
    unitsPerBox: 30,
    category: Category.OTHERS,
    imageUrl: 'https://images.unsplash.com/photo-1626716493137-b67fe9501e76?w=400&h=300&fit=crop',
    stockBoxes: 45,
    stockUnits: 1350,
    isControlled: false,
    minStock: 8,
    maxStock: 60, // Óptimo
    batches: [
      { lotNumber: 'M-212', expiryDate: '2027-10-14', quantity: 1350 } // Largo
    ]
  },
  {
    id: '13',
    name: 'Enalapril 10mg Terbol',
    genericName: 'Enalapril Maleato',
    laboratory: 'Terbol',
    description: 'Antihipertensivo inhibidor de la ECA.',
    priceBox: 55,
    priceUnit: 2,
    unitsPerBox: 30,
    category: Category.OTHERS,
    imageUrl: 'https://images.unsplash.com/photo-1584017945516-fa47c6142ace?w=400&h=300&fit=crop',
    stockBoxes: 50,
    stockUnits: 1500,
    isControlled: false,
    minStock: 10,
    maxStock: 80, // Óptimo
    batches: [
      { lotNumber: 'E-313', expiryDate: '2026-12-05', quantity: 1500 } // Corto (74 días)
    ]
  },
  {
    id: '14',
    name: 'Losartan 50mg Cofar',
    genericName: 'Losartan Potásico',
    laboratory: 'Cofar',
    description: 'Tratamiento de la hipertensión arterial.',
    priceBox: 65,
    priceUnit: 2.5,
    unitsPerBox: 30,
    category: Category.OTHERS,
    imageUrl: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=400&h=300&fit=crop',
    stockBoxes: 40,
    stockUnits: 1200,
    isControlled: false,
    minStock: 10,
    maxStock: 75, // Óptimo
    batches: [
      { lotNumber: 'LS-414', expiryDate: '2027-05-19', quantity: 1200 } // Largo
    ]
  },
  {
    id: '15',
    name: 'Dexametasona 4mg Sigma',
    genericName: 'Dexametasona Fosfato',
    laboratory: 'Sigma',
    description: 'Corticoide antiinflamatorio potente.',
    priceBox: 120,
    priceUnit: 6,
    unitsPerBox: 20,
    category: Category.OTHERS,
    imageUrl: 'https://images.unsplash.com/photo-1611073244284-f370834ec912?w=400&h=300&fit=crop',
    stockBoxes: 25,
    stockUnits: 500,
    isControlled: true,
    minStock: 5,
    maxStock: 30, // Óptimo
    batches: [
      { lotNumber: 'DX-515', expiryDate: '2026-08-30', quantity: 500 } // Vencido
    ]
  }
];

export const MOCK_STAFF: User[] = [
  { id: 'U1', name: 'Administrador La Paz', username: 'admin', password: 'admin', role: 'ADMIN', phone: '70010020', email: 'admin@farmapos.bo', assignedRegister: 'Caja 1' },
  { id: 'U2', name: 'Ricardo Mamani', username: 'ricardo', password: '123', role: 'PHARMACIST', phone: '71020030', email: 'ricardo@farmapos.bo', assignedRegister: 'Caja 1' },
  { id: 'U3', name: 'Sonia Quispe', username: 'sonia', password: '123', role: 'EMPLOYEE', phone: '72030040', email: 'sonia@farmapos.bo', assignedRegister: 'Caja 2' },
  { id: 'U4', name: 'Pedro Flores', username: 'pedro', role: 'EMPLOYEE', phone: '73040050', assignedRegister: 'Caja 2' },
  { id: 'U5', name: 'Maria Choque', username: 'maria', role: 'PHARMACIST', phone: '74050060', assignedRegister: 'Caja 1' },
  { id: 'U6', name: 'Juan Calle', username: 'juan', role: 'EMPLOYEE', phone: '75060070', assignedRegister: 'Caja 2' },
  { id: 'U7', name: 'Elena Villca', username: 'elena', role: 'ADMIN', phone: '76070080', assignedRegister: 'Caja 1' },
  { id: 'U8', name: 'Roberto Huanca', username: 'roberto', role: 'EMPLOYEE', phone: '77080090', assignedRegister: 'Caja 1' },
  { id: 'U9', name: 'Carmen Ticona', username: 'carmen', role: 'PHARMACIST', phone: '78090001', assignedRegister: 'Caja 2' },
  { id: 'U10', name: 'Felix Vargas', username: 'felix', role: 'EMPLOYEE', phone: '79011122', assignedRegister: 'Caja 2' },
  { id: 'U11', name: 'Juana Apaza', username: 'juana', role: 'EMPLOYEE', phone: '61022233', assignedRegister: 'Caja 1' },
  { id: 'U12', name: 'Angel Condori', username: 'angel', role: 'PHARMACIST', phone: '62033344', assignedRegister: 'Caja 1' },
  { id: 'U13', name: 'Silvia Ramos', username: 'silvia', role: 'EMPLOYEE', phone: '63044455', assignedRegister: 'Caja 2' },
  { id: 'U14', name: 'Javier Paco', username: 'javier', role: 'ADMIN', phone: '64055566', assignedRegister: 'Caja 1' },
  { id: 'U15', name: 'Lucia Blanco', username: 'lucia', role: 'EMPLOYEE', phone: '65066677', assignedRegister: 'Caja 2' }
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 'P1', name: 'Droguería Inti S.A.', phone: '2221010', ci: '1020304', address: 'Calle Lucas Jaimes, La Paz', status: 'active', registrationDate: '2020-01-01', lastUpdate: '2024-01-01' },
  { id: 'P2', name: 'Laboratorios Bago Bolivia', phone: '2224040', ci: '5060708', address: 'Zona Central, La Paz', status: 'active', registrationDate: '2020-01-01', lastUpdate: '2024-01-01' },
  { id: 'P3', name: 'Laboratorios Vita', phone: '2226060', ci: '9010111', address: 'El Alto, Bolivia', status: 'active', registrationDate: '2020-01-01', lastUpdate: '2024-01-01' },
  { id: 'P4', name: 'FARMACOS S.A.', phone: '2228080', ci: '1213141', status: 'active', address: 'Miraflores, La Paz', registrationDate: '2021-01-01', lastUpdate: '2024-01-01' },
  { id: 'P5', name: 'Droguería Sudamericana', phone: '2231010', ci: '1516171', status: 'active', address: 'Villa Fatima, La Paz', registrationDate: '2022-01-01', lastUpdate: '2024-01-01' },
  { id: 'P6', name: 'COFAR S.A.', phone: '2234040', ci: '1819202', status: 'active', address: 'Achumani, La Paz', registrationDate: '2021-05-15', lastUpdate: '2024-01-01' },
  { id: 'P7', name: 'Laboratorios INFAL', phone: '2236060', ci: '2122232', status: 'active', address: 'Zona Sur, La Paz', registrationDate: '2021-08-10', lastUpdate: '2024-01-01' },
  { id: 'P8', name: 'Laboratorios Delta', phone: '2238080', ci: '2425262', status: 'active', address: 'Sopocachi, La Paz', registrationDate: '2020-12-05', lastUpdate: '2024-01-01' },
  { id: 'P9', name: 'Laboratorios ALCOS', phone: '2241010', ci: '2728292', status: 'active', address: 'Max Paredes, La Paz', registrationDate: '2023-02-20', lastUpdate: '2024-01-01' },
  { id: 'P10', name: 'SIGMA Corp.', phone: '2244040', ci: '3031323', status: 'active', address: 'Gran Poder, La Paz', registrationDate: '2023-05-12', lastUpdate: '2024-01-01' },
  { id: 'P11', name: 'Droguería Hahnemann', phone: '2246060', ci: '3334353', status: 'active', address: 'Munaypata, La Paz', registrationDate: '2020-03-30', lastUpdate: '2024-01-01' },
  { id: 'P12', name: 'Droguería LAFAVET', phone: '2248080', ci: '3637383', status: 'active', address: 'Chasquipampa, La Paz', registrationDate: '2022-11-25', lastUpdate: '2024-01-01' },
  { id: 'P13', name: 'IFA S.A.', phone: '2251010', ci: '3940414', status: 'active', address: 'San Pedro, La Paz', registrationDate: '2021-09-15', lastUpdate: '2024-01-01' },
  { id: 'P14', name: 'Laboratorios Terbol', phone: '2254040', ci: '4243444', status: 'active', address: 'Calacoto, La Paz', registrationDate: '2022-04-10', lastUpdate: '2024-01-01' },
  { id: 'P15', name: 'Droguería Esmeralda', phone: '2256060', ci: '4546474', status: 'active', address: 'Irpavi, La Paz', registrationDate: '2023-09-22', lastUpdate: '2024-01-01' }
];

export const MOCK_SALES: SaleRecord[] = [
  { id: 'S1', timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), items: [{ medication: MOCK_MEDICATIONS[0], quantity: 2, isFractional: false, selectedBatch: 'T-101', subtotal: 90 }, { medication: MOCK_MEDICATIONS[1], quantity: 1, isFractional: false, selectedBatch: 'B-202', subtotal: 60 }], total: 150, customerName: 'Carlos Condori', customerId: 'C1', clientNit: '1234567 LP', documentType: 'FACTURA', insuranceName: 'Cliente Frecuente (5%)', userId: 'U2', cashierName: 'Ricardo Mamani', cashRegister: 'Caja 1', paymentMethod: 'CASH' },
  { id: 'S2', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), items: [{ medication: MOCK_MEDICATIONS[0], quantity: 1, isFractional: false, selectedBatch: 'T-101', subtotal: 45 }], total: 45, customerName: 'Ana Choque', customerId: 'C2', clientNit: '8765432 LP', documentType: 'FACTURA', insuranceName: 'Adulto Mayor (10%)', userId: 'U2', cashierName: 'Ricardo Mamani', cashRegister: 'Caja 1', paymentMethod: 'QR', qrVerified: true },
  { id: 'S3', timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), items: [{ medication: MOCK_MEDICATIONS[2], quantity: 1, isFractional: false, selectedBatch: 'I-303', subtotal: 80 }], total: 80, customerName: 'Luis Mamani', customerId: 'C3', clientNit: '4567890 LP', documentType: 'RECIBO', insuranceName: 'Sin Descuento (0%)', userId: 'U3', cashierName: 'Sonia Quispe', cashRegister: 'Caja 2', paymentMethod: 'CARD' },
  { id: 'S4', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), items: [{ medication: MOCK_MEDICATIONS[4], quantity: 4, isFractional: false, selectedBatch: 'O-505', subtotal: 200 }], total: 200, customerName: 'Maria Quispe', customerId: 'C4', clientNit: '3210987 LP', documentType: 'FACTURA', insuranceName: 'Cliente Frecuente (5%)', userId: 'U2', cashierName: 'Ricardo Mamani', cashRegister: 'Caja 1', paymentMethod: 'CASH' },
  { id: 'S5', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), items: [{ medication: MOCK_MEDICATIONS[6], quantity: 1, isFractional: false, selectedBatch: 'A-707', subtotal: 30 }], total: 30, customerName: 'Jorge Flores', customerId: 'C5', clientNit: '6543210 LP', documentType: 'RECIBO', insuranceName: 'Sin Descuento (0%)', userId: 'U3', cashierName: 'Sonia Quispe', cashRegister: 'Caja 2', paymentMethod: 'QR', qrVerified: true },
  { id: 'S6', timestamp: new Date(Date.now() - 3600000 * 6).toISOString(), items: [{ medication: MOCK_MEDICATIONS[5], quantity: 3, isFractional: false, selectedBatch: 'D-606', subtotal: 120 }], total: 120, customerName: 'Elena Huanca', customerId: 'C6', clientNit: '9876543 LP', documentType: 'FACTURA', insuranceName: 'Adulto Mayor (10%)', userId: 'U2', cashierName: 'Ricardo Mamani', cashRegister: 'Caja 1', paymentMethod: 'CASH' },
  { id: 'S7', timestamp: new Date(Date.now() - 3600000 * 7).toISOString(), items: [{ medication: MOCK_MEDICATIONS[9], quantity: 1, isFractional: false, selectedBatch: 'L-010', subtotal: 35 }, { medication: MOCK_MEDICATIONS[5], quantity: 10, isFractional: true, selectedBatch: 'D-606', subtotal: 20 }], total: 55, customerName: 'Roberto Ticona', customerId: 'C7', clientNit: '1357924 LP', documentType: 'RECIBO', insuranceName: 'Cliente Frecuente (5%)', userId: 'U3', cashierName: 'Sonia Quispe', cashRegister: 'Caja 2', paymentMethod: 'CARD' },
  { id: 'S8', timestamp: new Date(Date.now() - 3600000 * 8).toISOString(), items: [{ medication: MOCK_MEDICATIONS[3], quantity: 2, isFractional: false, selectedBatch: 'V-404', subtotal: 70 }, { medication: MOCK_MEDICATIONS[0], quantity: 10, isFractional: true, selectedBatch: 'T-101', subtotal: 25 }], total: 95, customerName: 'Sandra Vargas', customerId: 'C8', clientNit: '2468013 LP', documentType: 'FACTURA', insuranceName: 'Sin Descuento (0%)', userId: 'U2', cashierName: 'Ricardo Mamani', cashRegister: 'Caja 1', paymentMethod: 'QR', qrVerified: true },
  { id: 'S9', timestamp: new Date(Date.now() - 3600000 * 9).toISOString(), items: [{ medication: MOCK_MEDICATIONS[5], quantity: 1, isFractional: false, selectedBatch: 'D-606', subtotal: 40 }], total: 40, customerName: 'Felix Apaza', customerId: 'C9', clientNit: '5791357 LP', documentType: 'FACTURA', insuranceName: 'Sin Descuento (0%)', userId: 'U3', cashierName: 'Sonia Quispe', cashRegister: 'Caja 2', paymentMethod: 'CASH' },
  { id: 'S10', timestamp: new Date(Date.now() - 3600000 * 10).toISOString(), items: [{ medication: MOCK_MEDICATIONS[1], quantity: 3, isFractional: false, selectedBatch: 'B-202', subtotal: 180 }], total: 180, customerName: 'Carmen Mendoza', customerId: 'C10', clientNit: '8024680 LP', documentType: 'FACTURA', insuranceName: 'Adulto Mayor (10%)', userId: 'U2', cashierName: 'Ricardo Mamani', cashRegister: 'Caja 1', paymentMethod: 'QR', qrVerified: true },
  { id: 'S11', timestamp: new Date(Date.now() - 3600000 * 11).toISOString(), items: [{ medication: MOCK_MEDICATIONS[0], quantity: 10, isFractional: true, selectedBatch: 'T-101', subtotal: 25 }], total: 25, customerName: 'Victor Villca', customerId: 'C11', clientNit: '1111111 LP', documentType: 'RECIBO', insuranceName: 'Sin Descuento (0%)', userId: 'U3', cashierName: 'Sonia Quispe', cashRegister: 'Caja 2', paymentMethod: 'CASH' },
  { id: 'S12', timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), items: [{ medication: MOCK_MEDICATIONS[1], quantity: 1, isFractional: false, selectedBatch: 'B-202', subtotal: 60 }], total: 60, customerName: 'Juana Ramos', customerId: 'C12', clientNit: '2222222 LP', documentType: 'FACTURA', insuranceName: 'Adulto Mayor (10%)', userId: 'U2', cashierName: 'Ricardo Mamani', cashRegister: 'Caja 1', paymentMethod: 'CARD' },
  { id: 'S13', timestamp: new Date(Date.now() - 3600000 * 13).toISOString(), items: [{ medication: MOCK_MEDICATIONS[7], quantity: 1, isFractional: false, selectedBatch: 'CB-808', subtotal: 75 }, { medication: MOCK_MEDICATIONS[9], quantity: 1, isFractional: false, selectedBatch: 'L-010', subtotal: 35 }], total: 110, customerName: 'Angel Paco', customerId: 'C13', clientNit: '3333333 LP', documentType: 'FACTURA', insuranceName: 'Promoción Especial (15%)', userId: 'U3', cashierName: 'Sonia Quispe', cashRegister: 'Caja 2', paymentMethod: 'QR', qrVerified: true },
  { id: 'S14', timestamp: new Date(Date.now() - 3600000 * 14).toISOString(), items: [{ medication: MOCK_MEDICATIONS[9], quantity: 1, isFractional: false, selectedBatch: 'L-010', subtotal: 35 }], total: 35, customerName: 'Silvia Calle', customerId: 'C14', clientNit: '4444444 LP', documentType: 'RECIBO', insuranceName: 'Sin Descuento (0%)', userId: 'U2', cashierName: 'Ricardo Mamani', cashRegister: 'Caja 1', paymentMethod: 'CASH' },
  { id: 'S15', timestamp: new Date(Date.now() - 3600000 * 15).toISOString(), items: [{ medication: MOCK_MEDICATIONS[14], quantity: 1, isFractional: false, selectedBatch: 'DX-515', subtotal: 120 }, { medication: MOCK_MEDICATIONS[4], quantity: 10, isFractional: true, selectedBatch: 'O-505', subtotal: 20 }], total: 140, customerName: 'Javier Blanco', customerId: 'C15', clientNit: '5555555 LP', documentType: 'FACTURA', insuranceName: 'Adulto Mayor (10%)', userId: 'U3', cashierName: 'Sonia Quispe', cashRegister: 'Caja 2', paymentMethod: 'QR', qrVerified: true }
];

export const MOCK_PURCHASES: Purchase[] = [
  { id: 'P1', timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), invoiceNumber: 'INV-001', supplierId: 'P1', supplierName: 'Droguería Inti', warehouseName: 'Central', total: 5000, status: 'Completado', items: [], registrationDate: '2026-05-01' },
  { id: 'P2', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), invoiceNumber: 'INV-002', supplierId: 'P2', supplierName: 'Laboratorios Bago', warehouseName: 'Central', total: 3200, status: 'Completado', items: [], registrationDate: '2026-04-30' },
  { id: 'P3', timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), invoiceNumber: 'INV-003', supplierId: 'P3', supplierName: 'Laboratorios Vita', warehouseName: 'Central', total: 1500, status: 'Completado', items: [], registrationDate: '2026-04-29' },
  { id: 'P4', timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), invoiceNumber: 'INV-004', supplierId: 'P4', supplierName: 'FARMACOS S.A.', warehouseName: 'Central', total: 2800, status: 'Completado', items: [], registrationDate: '2026-04-28' },
  { id: 'P5', timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), invoiceNumber: 'INV-005', supplierId: 'P5', supplierName: 'Droguería Sudamericana', warehouseName: 'Central', total: 4100, status: 'Completado', items: [], registrationDate: '2026-04-27' },
  { id: 'P6', timestamp: new Date(Date.now() - 86400000 * 6).toISOString(), invoiceNumber: 'INV-006', supplierId: 'P6', supplierName: 'COFAR S.A.', warehouseName: 'Central', total: 1900, status: 'Completado', items: [], registrationDate: '2026-04-26' },
  { id: 'P7', timestamp: new Date(Date.now() - 86400000 * 7).toISOString(), invoiceNumber: 'INV-007', supplierId: 'P7', supplierName: 'Laboratorios INFAL', warehouseName: 'Central', total: 2300, status: 'Completado', items: [], registrationDate: '2026-04-25' },
  { id: 'P8', timestamp: new Date(Date.now() - 86400000 * 8).toISOString(), invoiceNumber: 'INV-008', supplierId: 'P8', supplierName: 'Laboratorios Delta', warehouseName: 'Central', total: 3500, status: 'Completado', items: [], registrationDate: '2026-04-24' },
  { id: 'P9', timestamp: new Date(Date.now() - 86400000 * 9).toISOString(), invoiceNumber: 'INV-009', supplierId: 'P9', supplierName: 'Laboratorios ALCOS', warehouseName: 'Central', total: 1200, status: 'Completado', items: [], registrationDate: '2026-04-23' },
  { id: 'P10', timestamp: new Date(Date.now() - 86400000 * 10).toISOString(), invoiceNumber: 'INV-010', supplierId: 'P10', supplierName: 'SIGMA Corp.', warehouseName: 'Central', total: 4700, status: 'Completado', items: [], registrationDate: '2026-04-22' },
  { id: 'P11', timestamp: new Date(Date.now() - 86400000 * 11).toISOString(), invoiceNumber: 'INV-011', supplierId: 'P11', supplierName: 'Droguería Hahnemann', warehouseName: 'Central', total: 800, status: 'Completado', items: [], registrationDate: '2026-04-21' },
  { id: 'P12', timestamp: new Date(Date.now() - 86400000 * 12).toISOString(), invoiceNumber: 'INV-012', supplierId: 'P12', supplierName: 'Droguería LAFAVET', warehouseName: 'Central', total: 2100, status: 'Completado', items: [], registrationDate: '2026-04-20' },
  { id: 'P13', timestamp: new Date(Date.now() - 86400000 * 13).toISOString(), invoiceNumber: 'INV-013', supplierId: 'P13', supplierName: 'IFA S.A.', warehouseName: 'Central', total: 3400, status: 'Completado', items: [], registrationDate: '2026-04-19' },
  { id: 'P14', timestamp: new Date(Date.now() - 86400000 * 14).toISOString(), invoiceNumber: 'INV-014', supplierId: 'P14', supplierName: 'Laboratorios Terbol', warehouseName: 'Central', total: 1600, status: 'Completado', items: [], registrationDate: '2026-04-18' },
  { id: 'P15', timestamp: new Date(Date.now() - 86400000 * 15).toISOString(), invoiceNumber: 'INV-015', supplierId: 'P15', supplierName: 'Droguería Esmeralda', warehouseName: 'Central', total: 2900, status: 'Completado', items: [], registrationDate: '2026-04-17' }
];
