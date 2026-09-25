
import { jsPDF } from 'jspdf';
import { SaleRecord, PharmacyInfo } from '@/types';
import { DEFAULT_PHARMACY_INFO } from '@/constants';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';

/**
 * Converts a number to its Spanish word representation (Simplified for Bolivian currency)
 */
export const numberToWords = (num: number): string => {
  const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const special = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const hundreds = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETENCIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  if (num === 0) return 'CERO';

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  const convertGroup = (n: number): string => {
    let output = '';
    if (n >= 100) {
      if (n === 100) return 'CIEN';
      if (n > 100 && n < 200) output += 'CIENTO ';
      else output += hundreds[Math.floor(n / 100)] + ' ';
      n %= 100;
    }
    if (n >= 20) {
      output += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' Y ' + units[n % 10] : '');
    } else if (n >= 10) {
      output += special[n - 10];
    } else {
      output += units[n];
    }
    return output.trim();
  };

  let result = '';
  if (integerPart >= 1000) {
    const thousands = Math.floor(integerPart / 1000);
    result += (thousands === 1 ? 'MIL' : convertGroup(thousands) + ' MIL') + ' ';
    result += convertGroup(integerPart % 1000);
  } else {
    result = convertGroup(integerPart);
  }

  return `SON: ${result.trim()} ${decimalPart.toString().padStart(2, '0')}/100 BOLIVIANOS`;
};

/**
 * Generates a Bolivian style invoice or receipt PDF (Ticket Style 80mm)
 * Supports:
 * - Custom Pharmacy Name & Info
 * - Both Commercial and Generic names
 * - Factura vs Recibo de Venta (sin factura)
 * - QR payment details
 */
export const generateBolivianInvoice = async (
  sale: SaleRecord, 
  currencySymbol: string,
  pharmacyInfo: PharmacyInfo = DEFAULT_PHARMACY_INFO
) => {
  const isReceipt = sale.documentType === 'RECIBO';
  const width = 80; // 80mm standard thermal paper
  const height = 190 + (sale.items.length * 14);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [width, height]
  });

  const margin = 5;
  let y = 8;

  // Header - Pharmacy Name & Business Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const pharmacyName = (pharmacyInfo.commercialName || pharmacyInfo.name || 'FARMACIA').toUpperCase();
  doc.text(pharmacyName, width / 2, y, { align: 'center', maxWidth: 70 });
  y += 5;

  if (pharmacyInfo.name && pharmacyInfo.name !== pharmacyInfo.commercialName) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(pharmacyInfo.name.toUpperCase(), width / 2, y, { align: 'center', maxWidth: 70 });
    y += 4;
  }

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Casa Matriz: ${pharmacyInfo.address || 'Calle Comercio #456'}`, width / 2, y, { align: 'center', maxWidth: 70 });
  y += 3.5;
  doc.text(`Teléfono: ${pharmacyInfo.phone || '2-2445566'}`, width / 2, y, { align: 'center' });
  y += 3.5;
  doc.text(pharmacyInfo.city || 'La Paz - Bolivia', width / 2, y, { align: 'center' });
  y += 5;

  // Document Title
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  if (isReceipt) {
    doc.text('RECIBO DE VENTA', width / 2, y, { align: 'center' });
    y += 3.5;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('(DOCUMENTO NO VÁLIDO PARA CRÉDITO FISCAL)', width / 2, y, { align: 'center' });
    y += 4.5;
  } else {
    doc.text('FACTURA', width / 2, y, { align: 'center' });
    y += 3.5;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('(CON DERECHO A CRÉDITO FISCAL)', width / 2, y, { align: 'center' });
    y += 4.5;
  }

  // Document Metadata
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIT: ${pharmacyInfo.nit || '1020304050'}`, width / 2, y, { align: 'center' });
  y += 3.2;
  const docNumber = sale.id.replace(/\D/g, '').substring(0, 6) || Math.floor(100000 + Math.random() * 900000).toString();
  doc.text(`N° ${isReceipt ? 'RECIBO' : 'FACTURA'}: ${docNumber}`, width / 2, y, { align: 'center' });
  y += 3.2;

  if (!isReceipt) {
    doc.text(`N° AUTORIZACIÓN: ${pharmacyInfo.authorizationNumber || '29040011007'}`, width / 2, y, { align: 'center' });
    y += 5;
  } else {
    y += 3;
  }

  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.line(margin, y, width - margin, y);
  y += 4.5;

  // Customer & Sale Info
  doc.setFont('helvetica', 'bold');
  doc.text('FECHA:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(sale.timestamp).toLocaleString('es-BO'), margin + 14, y);
  y += 3.8;

  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', margin, y);
  doc.setFont('helvetica', 'normal');
  const clientName = sale.clientBusinessName || sale.customerName || 'CLIENTE PARTICULAR';
  doc.text(clientName.toUpperCase(), margin + 14, y, { maxWidth: 55 });
  y += 3.8;

  doc.setFont('helvetica', 'bold');
  doc.text('NIT/CI:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.clientNit || '0', margin + 14, y);
  y += 3.8;

  doc.setFont('helvetica', 'bold');
  doc.text('MÉTODO PAGO:', margin, y);
  doc.setFont('helvetica', 'normal');
  let paymentLabel = 'EFECTIVO';
  if (sale.paymentMethod === 'QR') {
    paymentLabel = sale.qrVerified ? 'PAGO QR (CONFIRMADO Y VERIFICADO)' : 'PAGO POR QR';
  } else if (sale.paymentMethod === 'CARD') {
    paymentLabel = 'TARJETA DE DÉBITO/CRÉDITO';
  }
  doc.text(paymentLabel, margin + 24, y);
  y += 5;

  doc.line(margin, y, width - margin, y);
  y += 4.5;

  // Items Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('CANT', margin, y);
  doc.text('DETALLE (COMERCIAL / GENÉRICO)', margin + 9, y);
  doc.text('SUBTOTAL', width - margin, y, { align: 'right' });
  y += 4;
  doc.setFont('helvetica', 'normal');

  // Items List: With BOTH Commercial and Generic names
  sale.items.forEach(item => {
    const commercialName = item.medication.name;
    const genericName = item.medication.genericName ? `(${item.medication.genericName})` : '';
    const unitPrice = (item.subtotal / item.quantity).toFixed(2);
    const fractionLabel = item.isFractional ? 'unid.' : 'cja.';

    // Line 1: Quantity, Commercial Name, Subtotal
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.quantity} ${fractionLabel}`, margin, y);
    doc.text(commercialName.substring(0, 24), margin + 11, y);
    doc.text(`${currencySymbol} ${item.subtotal.toFixed(2)}`, width - margin, y, { align: 'right' });
    y += 3.2;

    // Line 2: Generic Name & Unit price
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    const subDesc = `${genericName} [P.U: ${unitPrice}] Lote: ${item.selectedBatch}`;
    doc.text(subDesc.substring(0, 36), margin + 11, y);
    doc.setFontSize(6.5);
    y += 4;
  });

  y += 1;
  doc.line(margin, y, width - margin, y);
  y += 4.5;

  // Totals
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL ${currencySymbol}:`, margin, y);
  doc.text(`${sale.total.toFixed(2)}`, width - margin, y, { align: 'right' });
  y += 5;

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(numberToWords(sale.total), margin, y, { maxWidth: 70 });
  y += 6;

  if (!isReceipt) {
    // Fiscal details only on Factura
    doc.setFontSize(6.5);
    doc.text('CÓDIGO DE CONTROL: 6A-7B-8C-9D', margin, y);
    y += 3.5;
    doc.text('FECHA LÍMITE DE EMISIÓN: 31/12/2026', margin, y);
    y += 6;

    // QR Code Generation for fiscal verification
    try {
      const nitEmisor = pharmacyInfo.nit || '1020304050';
      const nroFactura = docNumber;
      const nroAutorizacion = pharmacyInfo.authorizationNumber || '29040011007';
      const fechaEmision = new Date(sale.timestamp).toLocaleDateString('es-BO');
      const total = sale.total.toFixed(2);
      const baseCreditoFiscal = sale.total.toFixed(2);
      const codigoControl = '6A-7B-8C-9D';
      const nitCliente = sale.clientNit || '0';
      
      const qrString = `${nitEmisor}|${nroFactura}|${nroAutorizacion}|${fechaEmision}|${total}|${baseCreditoFiscal}|${codigoControl}|${nitCliente}|0|0|0|0`;
      
      const qrDataUrl = await QRCode.toDataURL(qrString, { margin: 1, width: 90 });
      doc.addImage(qrDataUrl, 'PNG', width / 2 - 12, y, 24, 24);
    } catch (err) {
      console.error('Error generating QR code', err);
      doc.rect(width / 2 - 10, y, 20, 20);
      doc.setFontSize(5);
      doc.text('ERROR QR', width / 2, y + 10, { align: 'center' });
    }
    
    y += 28;

    // Legal Legend
    doc.setFontSize(5.5);
    doc.text('"ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO DE ÉSTA SERÁ SANCIONADO DE ACUERDO A LA LEY"', width / 2, y, { align: 'center', maxWidth: 70 });
    y += 5;
    doc.text('Ley N° 453: El proveedor deberá suministrar el servicio en las condiciones acordadas.', width / 2, y, { align: 'center', maxWidth: 70 });
  } else {
    // Receipt Footer
    doc.line(margin, y, width - margin, y);
    y += 4;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('¡GRACIAS POR SU PREFERENCIA!', width / 2, y, { align: 'center' });
    y += 4;
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Conserve este recibo para cualquier reclamo o consulta.', width / 2, y, { align: 'center', maxWidth: 70 });
    y += 3.5;
    doc.text(`Atendido por Farmacéutico de Turno - FarmaPOS`, width / 2, y, { align: 'center' });
  }

  const filePrefix = isReceipt ? 'Recibo' : 'Factura';
  doc.save(`${filePrefix}_${pharmacyName.replace(/\s+/g, '_')}_${sale.id}.pdf`);
};

/**
 * Generates an official 5x8 inches (Media Carta / 127mm x 203.2mm) Bolivian Invoice / Receipt
 */
export const generate5x8Invoice = async (
  sale: SaleRecord,
  currencySymbol: string = 'Bs',
  pharmacyInfo: PharmacyInfo = DEFAULT_PHARMACY_INFO
) => {
  const isReceipt = sale.documentType === 'RECIBO';
  // 5x8 inches in mm: 5 * 25.4 = 127mm width, 8 * 25.4 = 203.2mm height
  const width = 127;
  const height = 203.2;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [width, height]
  });

  const margin = 7;
  const contentWidth = width - (margin * 2);
  let y = 8;

  // Outer border box for standard 5x8 half-sheet presentation
  doc.setDrawColor(180, 190, 200);
  doc.setLineWidth(0.3);
  doc.rect(margin, margin, contentWidth, height - (margin * 2));

  y = 12;

  // Header Left: Pharmacy Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 30, 45);
  const pharmacyName = (pharmacyInfo.commercialName || pharmacyInfo.name || 'FARMACIA FARMASALUD').toUpperCase();
  doc.text(pharmacyName, margin + 3, y);
  
  y += 4;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 90, 100);
  doc.text(pharmacyInfo.name.toUpperCase(), margin + 3, y);

  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`Casa Matriz: ${pharmacyInfo.address || 'Av. 16 de Julio #1490, El Prado'}`, margin + 3, y, { maxWidth: 62 });
  y += 3.2;
  doc.text(`Tel: ${pharmacyInfo.phone || '2-2445566'} • ${pharmacyInfo.city || 'La Paz - Bolivia'}`, margin + 3, y);

  // Header Right: Invoice Box
  const boxX = margin + contentWidth - 48;
  const boxY = 10;
  const boxW = 46;
  const boxH = 26;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, 'FD');
  doc.setDrawColor(200, 210, 220);
  doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(`NIT: ${pharmacyInfo.nit || '1020304050'}`, boxX + (boxW / 2), boxY + 4, { align: 'center' });

  const docNumber = sale.id.replace(/\D/g, '').substring(0, 7) || Math.floor(1000000 + Math.random() * 9000000).toString();
  doc.setFontSize(8.5);
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(`${isReceipt ? 'RECIBO' : 'FACTURA'} N° ${docNumber}`, boxX + (boxW / 2), boxY + 8.5, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  if (!isReceipt) {
    doc.setFont('helvetica', 'normal');
    doc.text(`AUTORIZACIÓN N°:`, boxX + (boxW / 2), boxY + 12.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${pharmacyInfo.authorizationNumber || '29040011007'}`, boxX + (boxW / 2), boxY + 15.5, { align: 'center' });
  } else {
    doc.text(`(DOCUMENTO INTERNO NO FISCAL)`, boxX + (boxW / 2), boxY + 14, { align: 'center' });
  }

  // Register and Cashier inside box
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  const cajaLabel = sale.cashRegister || 'Caja 1';
  const cajeroLabel = sale.cashierName || sale.userId || 'Operador';
  doc.text(`${cajaLabel.toUpperCase()} • ${cajeroLabel.substring(0, 16)}`, boxX + (boxW / 2), boxY + 21, { align: 'center' });
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.text('ORIGINAL', boxX + (boxW / 2), boxY + 24.5, { align: 'center' });

  y = 38;

  // Divider Line
  doc.setDrawColor(210, 220, 230);
  doc.line(margin + 2, y, margin + contentWidth - 2, y);
  y += 3.5;

  // Customer & Transaction Details Grid Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + 2, y, contentWidth - 4, 15, 1, 1, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + 2, y, contentWidth - 4, 15, 1, 1, 'S');

  // Client Details Row 1
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('LUGAR Y FECHA:', margin + 4, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${pharmacyInfo.city || 'La Paz'}, ${new Date(sale.timestamp).toLocaleString('es-BO')}`, margin + 25, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('NIT / CI:', margin + 68, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(sale.clientNit || '0', margin + 80, y + 4.5);

  // Client Details Row 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('SEÑOR(ES):', margin + 4, y + 9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const clientName = sale.clientBusinessName || sale.customerName || 'CLIENTE PARTICULAR';
  doc.text(clientName.toUpperCase(), margin + 25, y + 9.5, { maxWidth: 42 });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('FORMA PAGO:', margin + 68, y + 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  let pagoTxt = 'EFECTIVO';
  if (sale.paymentMethod === 'QR') pagoTxt = 'QR BANCARIO';
  if (sale.paymentMethod === 'CARD') pagoTxt = 'TARJETA';
  doc.text(pagoTxt, margin + 87, y + 9.5);

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('SEGURO / PLAN:', margin + 4, y + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(sale.insuranceName || 'Particular', margin + 25, y + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('PUNTO COBRO:', margin + 68, y + 13.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`${sale.cashRegister || 'Caja 1'}`, margin + 87, y + 13.5);

  y += 18;

  // Items Table Header
  const tableX = margin + 2;
  const tableW = contentWidth - 4;
  doc.setFillColor(226, 232, 240);
  doc.rect(tableX, y, tableW, 5.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(tableX, y, tableW, 5.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(30, 41, 59);
  doc.text('CANT', tableX + 2, y + 3.8);
  doc.text('DESCRIPCIÓN (COMERCIAL / GENÉRICO)', tableX + 13, y + 3.8);
  doc.text('LOTE', tableX + 66, y + 3.8);
  doc.text('P. UNIT', tableX + 83, y + 3.8, { align: 'right' });
  doc.text(`TOTAL (${currencySymbol})`, tableX + tableW - 2, y + 3.8, { align: 'right' });

  y += 5.5;

  // Items Table Content
  doc.setFont('helvetica', 'normal');
  const maxRows = 12;
  const displayedItems = sale.items.slice(0, maxRows);

  displayedItems.forEach((item, index) => {
    const isEven = index % 2 === 0;
    const rowH = 6;
    if (isEven) {
      doc.setFillColor(252, 253, 254);
      doc.rect(tableX, y, tableW, rowH, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.rect(tableX, y, tableW, rowH, 'S');

    // Quantity
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    const unitLabel = item.isFractional ? 'u.' : 'c.';
    doc.text(`${item.quantity} ${unitLabel}`, tableX + 2, y + 4);

    // Medication Commercial & Generic Name
    const commName = item.medication.name;
    const genName = item.medication.genericName ? `(${item.medication.genericName})` : '';
    doc.text(commName.substring(0, 26), tableX + 13, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(100, 116, 139);
    doc.text(genName.substring(0, 32), tableX + 13, y + 5);

    // Lot
    doc.setFontSize(5.5);
    doc.setTextColor(51, 65, 85);
    doc.text(item.selectedBatch || 'N/A', tableX + 66, y + 4);

    // Unit Price
    const uPrice = (item.subtotal / item.quantity).toFixed(2);
    doc.text(uPrice, tableX + 83, y + 4, { align: 'right' });

    // Subtotal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(item.subtotal.toFixed(2), tableX + tableW - 2, y + 4, { align: 'right' });

    y += rowH;
  });

  // Remaining space fill up to 8 rows minimum for clean uniform look
  const emptyRows = Math.max(0, 4 - displayedItems.length);
  for (let i = 0; i < emptyRows; i++) {
    doc.setDrawColor(241, 245, 249);
    doc.rect(tableX, y, tableW, 5.5, 'S');
    y += 5.5;
  }

  // Totals Section
  y += 2;
  const totalsW = 46;
  const totalsX = tableX + tableW - totalsW;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsX, y, totalsW, 16, 1, 1, 'FD');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(totalsX, y, totalsW, 16, 1, 1, 'S');

  const subtotalCalc = sale.items.reduce((s, it) => s + it.subtotal, 0);
  const discountCalc = Math.max(0, subtotalCalc - sale.total);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('SUBTOTAL:', totalsX + 3, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${currencySymbol} ${subtotalCalc.toFixed(2)}`, totalsX + totalsW - 3, y + 4, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('DESCUENTO SEGURO:', totalsX + 3, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 38, 38);
  doc.text(`- ${currencySymbol} ${discountCalc.toFixed(2)}`, totalsX + totalsW - 3, y + 8, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(totalsX + 2, y + 10.5, totalsX + totalsW - 2, y + 10.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('TOTAL A PAGAR:', totalsX + 3, y + 14.5);
  doc.text(`${currencySymbol} ${sale.total.toFixed(2)}`, totalsX + totalsW - 3, y + 14.5, { align: 'right' });

  // Left of totals: Literal total amount
  const literalX = tableX;
  const literalW = contentWidth - totalsW - 6;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('CANTIDAD EN LETRAS:', literalX, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(numberToWords(sale.total), literalX, y + 8, { maxWidth: literalW });

  y += 20;

  // Fiscal Section & QR Code Box
  if (!isReceipt) {
    const fiscalBoxY = y;
    const fiscalBoxH = 26;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(tableX, fiscalBoxY, tableW, fiscalBoxH, 1, 1, 'FD');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(tableX, fiscalBoxY, tableW, fiscalBoxH, 1, 1, 'S');

    // QR Code
    try {
      const nitEmisor = pharmacyInfo.nit || '1020304050';
      const nroFactura = docNumber;
      const nroAutorizacion = pharmacyInfo.authorizationNumber || '29040011007';
      const fechaEmision = new Date(sale.timestamp).toLocaleDateString('es-BO');
      const totalStr = sale.total.toFixed(2);
      const codigoControl = '6A-7B-8C-9D';
      const nitCliente = sale.clientNit || '0';
      
      const qrString = `${nitEmisor}|${nroFactura}|${nroAutorizacion}|${fechaEmision}|${totalStr}|${totalStr}|${codigoControl}|${nitCliente}|0|0|0|0`;
      const qrDataUrl = await QRCode.toDataURL(qrString, { margin: 1, width: 90 });
      doc.addImage(qrDataUrl, 'PNG', tableX + 2, fiscalBoxY + 2, 22, 22);
    } catch (err) {
      console.error('Error QR', err);
    }

    // Fiscal Text next to QR
    const textX = tableX + 26;
    const textW = tableW - 28;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('CÓDIGO DE CONTROL: 6A-7B-8C-9D', textX, fiscalBoxY + 5);
    doc.text('FECHA LÍMITE DE EMISIÓN: 31/12/2026', textX, fiscalBoxY + 8.5);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('"ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO DE ÉSTA SERÁ SANCIONADO DE ACUERDO A LA LEY"', textX, fiscalBoxY + 13, { maxWidth: textW });
    doc.text('Ley N° 453: El proveedor deberá suministrar el servicio en las condiciones acordadas.', textX, fiscalBoxY + 18, { maxWidth: textW });

    y = fiscalBoxY + fiscalBoxH + 4;
  } else {
    // Receipt Footer Banner
    const receiptBoxY = y;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(tableX, receiptBoxY, tableW, 16, 1, 1, 'FD');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('¡GRACIAS POR SU PREFERENCIA! • RECIBO OFICIAL DE MOSTRADOR', tableX + (tableW / 2), receiptBoxY + 5, { align: 'center' });
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Conserve este recibo para cualquier cambio o reclamo. Válido dentro de las 48 horas con empaque intacto.', tableX + (tableW / 2), receiptBoxY + 9, { align: 'center' });
    doc.text(`Atendido en ${sale.cashRegister || 'Caja 1'} por: ${sale.cashierName || sale.userId || 'Personal FarmaPOS'}`, tableX + (tableW / 2), receiptBoxY + 13, { align: 'center' });
    y = receiptBoxY + 18;
  }

  // Signature Block
  const sigW = 40;
  const sigX = margin + contentWidth - sigW - 4;
  const sigY = height - margin - 12;
  doc.setDrawColor(180, 190, 200);
  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.line(sigX, sigY, sigX + sigW, sigY);
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Firma y Sello Cajero / Dispensador', sigX + (sigW / 2), sigY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`${sale.cashierName || 'Cajero'} - ${sale.cashRegister || 'Caja 1'}`, sigX + (sigW / 2), sigY + 6.5, { align: 'center' });

  const filePrefix = isReceipt ? 'Recibo_5x8' : 'Factura_5x8';
  doc.save(`${filePrefix}_${pharmacyName.replace(/\s+/g, '_')}_${sale.id}.pdf`);
};

/**
 * Exports a single invoice to an Excel (.xlsx) file
 */
export const exportSingleInvoiceToExcel = (
  sale: SaleRecord,
  pharmacyInfo: PharmacyInfo = DEFAULT_PHARMACY_INFO,
  currencySymbol: string = 'Bs'
) => {
  const isReceipt = sale.documentType === 'RECIBO';
  const docTypeLabel = isReceipt ? 'RECIBO DE VENTA' : 'FACTURA OFICIAL';
  
  // Format items data
  const itemsData = sale.items.map((item, idx) => ({
    'N°': idx + 1,
    'Cantidad': item.quantity,
    'Presentación': item.isFractional ? 'Unidad' : 'Caja',
    'Medicamento Comercial': item.medication.name,
    'Nombre Genérico': item.medication.genericName || 'N/A',
    'Laboratorio': item.medication.laboratory || 'N/A',
    'Número de Lote': item.selectedBatch || 'N/A',
    [`Precio Unitario (${currencySymbol})`]: (item.subtotal / item.quantity).toFixed(2),
    [`Subtotal (${currencySymbol})`]: item.subtotal.toFixed(2)
  }));

  // Overview info
  const invoiceOverview = [
    { 'CAMPO': 'Farmacia Emisora', 'VALOR': pharmacyInfo.commercialName || pharmacyInfo.name },
    { 'CAMPO': 'Razón Social', 'VALOR': pharmacyInfo.name },
    { 'CAMPO': 'NIT Farmacia', 'VALOR': pharmacyInfo.nit },
    { 'CAMPO': 'N° Autorización', 'VALOR': pharmacyInfo.authorizationNumber || '29040011007' },
    { 'CAMPO': 'Tipo de Documento', 'VALOR': docTypeLabel },
    { 'CAMPO': 'N° de Factura / ID', 'VALOR': sale.id },
    { 'CAMPO': 'Fecha y Hora', 'VALOR': new Date(sale.timestamp).toLocaleString('es-BO') },
    { 'CAMPO': 'Punto de Venta / Caja', 'VALOR': sale.cashRegister || 'Caja 1' },
    { 'CAMPO': 'Cajero / Usuario', 'VALOR': sale.cashierName || sale.userId },
    { 'CAMPO': 'Cliente / Paciente', 'VALOR': sale.clientBusinessName || sale.customerName || 'Venta General' },
    { 'CAMPO': 'NIT o CI Cliente', 'VALOR': sale.clientNit || '0' },
    { 'CAMPO': 'Seguro Médico', 'VALOR': sale.insuranceName || 'Particular' },
    { 'CAMPO': 'Método de Pago', 'VALOR': sale.paymentMethod },
    { 'CAMPO': 'Pago QR Verificado', 'VALOR': sale.qrVerified ? 'SÍ' : 'NO' },
    { 'CAMPO': `Total Facturado (${currencySymbol})`, 'VALOR': sale.total.toFixed(2) },
    { 'CAMPO': 'Importe en Palabras', 'VALOR': numberToWords(sale.total) }
  ];

  const wb = XLSX.utils.book_new();

  // Create sheet 1: Detalle de Factura
  const wsItems = XLSX.utils.json_to_sheet(itemsData);
  XLSX.utils.book_append_sheet(wb, wsItems, 'Productos Facturados');

  // Create sheet 2: Datos de Cabecera
  const wsOverview = XLSX.utils.json_to_sheet(invoiceOverview);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Cabecera Factura');

  const filename = `${isReceipt ? 'Recibo' : 'Factura'}_${(sale.cashRegister || 'Caja1').replace(/\s+/g, '')}_${sale.id}.xlsx`;
  XLSX.writeFile(wb, filename);
};

/**
 * Exports a comprehensive list of invoices to Excel with multi-tab details
 */
export const exportInvoicesDetailedToExcel = (
  sales: SaleRecord[],
  pharmacyInfo: PharmacyInfo = DEFAULT_PHARMACY_INFO,
  filterDescription: string = 'Todas_las_Cajas'
) => {
  // Sheet 1: Invoices summary
  const invoicesSummary = sales.map(sale => {
    const subtotal = sale.items.reduce((s, it) => s + it.subtotal, 0);
    const discount = Math.max(0, subtotal - sale.total);
    return {
      'ID Venta': sale.id,
      'N° Factura': sale.id.replace(/\D/g, '').substring(0, 7) || sale.id,
      'Fecha': new Date(sale.timestamp).toLocaleDateString('es-BO'),
      'Hora': new Date(sale.timestamp).toLocaleTimeString('es-BO'),
      'Tipo Doc': sale.documentType === 'RECIBO' ? 'Recibo' : 'Factura',
      'Caja': sale.cashRegister || 'Caja 1',
      'Cajero / Usuario': sale.cashierName || sale.userId,
      'Cliente / Paciente': sale.clientBusinessName || sale.customerName || 'Venta General',
      'NIT / CI Cliente': sale.clientNit || '0',
      'Seguro': sale.insuranceName || 'Particular',
      'Método de Pago': sale.paymentMethod,
      'QR Verificado': sale.qrVerified ? 'SÍ' : (sale.paymentMethod === 'QR' ? 'SÍ' : '-'),
      'Cant. Items': sale.items.length,
      'Subtotal (Bs)': subtotal.toFixed(2),
      'Descuento (Bs)': discount.toFixed(2),
      'Total Factura (Bs)': sale.total.toFixed(2),
      'Estado': 'Completada / Emitida'
    };
  });

  // Sheet 2: Items Sold Detail
  const itemsBreakdown: any[] = [];
  sales.forEach(sale => {
    sale.items.forEach(item => {
      itemsBreakdown.push({
        'ID Venta': sale.id,
        'Fecha': new Date(sale.timestamp).toLocaleDateString('es-BO'),
        'Caja': sale.cashRegister || 'Caja 1',
        'Cajero': sale.cashierName || sale.userId,
        'Cliente': sale.customerName,
        'Medicamento Comercial': item.medication.name,
        'Nombre Genérico': item.medication.genericName || 'N/A',
        'Laboratorio': item.medication.laboratory || 'N/A',
        'N° Lote': item.selectedBatch || 'N/A',
        'Cantidad': item.quantity,
        'Tipo': item.isFractional ? 'Unidad' : 'Caja',
        'Precio Unit. (Bs)': (item.subtotal / item.quantity).toFixed(2),
        'Subtotal (Bs)': item.subtotal.toFixed(2)
      });
    });
  });

  // Sheet 3: Register Summary (Caja 1 vs Caja 2)
  const caja1Sales = sales.filter(s => (s.cashRegister || 'Caja 1') === 'Caja 1');
  const caja2Sales = sales.filter(s => s.cashRegister === 'Caja 2');

  const caja1Total = caja1Sales.reduce((sum, s) => sum + s.total, 0);
  const caja2Total = caja2Sales.reduce((sum, s) => sum + s.total, 0);

  const caja1Cash = caja1Sales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + s.total, 0);
  const caja1QR = caja1Sales.filter(s => s.paymentMethod === 'QR').reduce((sum, s) => sum + s.total, 0);
  const caja1Card = caja1Sales.filter(s => s.paymentMethod === 'CARD').reduce((sum, s) => sum + s.total, 0);

  const caja2Cash = caja2Sales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + s.total, 0);
  const caja2QR = caja2Sales.filter(s => s.paymentMethod === 'QR').reduce((sum, s) => sum + s.total, 0);
  const caja2Card = caja2Sales.filter(s => s.paymentMethod === 'CARD').reduce((sum, s) => sum + s.total, 0);

  const registerSummary = [
    {
      'Caja': 'Caja 1',
      'Total Transacciones': caja1Sales.length,
      'Total Facturado (Bs)': caja1Total.toFixed(2),
      'Efectivo (Bs)': caja1Cash.toFixed(2),
      'Pago QR (Bs)': caja1QR.toFixed(2),
      'Tarjeta (Bs)': caja1Card.toFixed(2),
      'Cajeros Asignados': Array.from(new Set(caja1Sales.map(s => s.cashierName || s.userId))).join(', ') || 'N/A'
    },
    {
      'Caja': 'Caja 2',
      'Total Transacciones': caja2Sales.length,
      'Total Facturado (Bs)': caja2Total.toFixed(2),
      'Efectivo (Bs)': caja2Cash.toFixed(2),
      'Pago QR (Bs)': caja2QR.toFixed(2),
      'Tarjeta (Bs)': caja2Card.toFixed(2),
      'Cajeros Asignados': Array.from(new Set(caja2Sales.map(s => s.cashierName || s.userId))).join(', ') || 'N/A'
    },
    {
      'Caja': 'TOTAL GENERAL',
      'Total Transacciones': sales.length,
      'Total Facturado (Bs)': (caja1Total + caja2Total).toFixed(2),
      'Efectivo (Bs)': (caja1Cash + caja2Cash).toFixed(2),
      'Pago QR (Bs)': (caja1QR + caja2QR).toFixed(2),
      'Tarjeta (Bs)': (caja1Card + caja2Card).toFixed(2),
      'Cajeros Asignados': 'Todos los operadores'
    }
  ];

  const wb = XLSX.utils.book_new();

  // Add sheets
  const ws1 = XLSX.utils.json_to_sheet(invoicesSummary);
  XLSX.utils.book_append_sheet(wb, ws1, 'Facturas Realizadas');

  const ws2 = XLSX.utils.json_to_sheet(itemsBreakdown);
  XLSX.utils.book_append_sheet(wb, ws2, 'Detalle Medicamentos');

  const ws3 = XLSX.utils.json_to_sheet(registerSummary);
  XLSX.utils.book_append_sheet(wb, ws3, 'Corte por Caja');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Facturas_${filterDescription}_${dateStr}.xlsx`);
};

export const exportSalesToExcel = (sales: SaleRecord[], filename: string) => {
  exportInvoicesDetailedToExcel(sales, DEFAULT_PHARMACY_INFO, filename);
};

export const generateReportPDF = (title: string, data: any[], columns: string[], filename: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  // Header
  // Logo Placeholder (Cross)
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin + 5, 12, margin + 15, 12);
  doc.line(margin + 10, 7, margin + 10, 17);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('FARMASALUD BOLIVIA', margin + 20, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Seccional La Paz - Sede Central', margin + 20, 16);
  
  const now = new Date();
  doc.setFontSize(7);
  doc.text(`Fecha y hora de impresión`, 100, 10, { align: 'center' });
  doc.text(`${now.toLocaleDateString()}  ${now.toLocaleTimeString()}`, 100, 14, { align: 'center' });
  
  doc.text(`Consecutivo ERP- ${Math.floor(Math.random() * 10000000)}`, pageWidth - margin, 10, { align: 'right' });
  doc.text('Pag 1/1', pageWidth - margin, 14, { align: 'right' });

  let y = 25;

  // Section Header: DATOS DEL REPORTE
  doc.setFillColor(217, 233, 245); // Light blue
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.rect(margin, y, contentWidth, 6, 'S');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), pageWidth / 2, y + 4, { align: 'center' });
  
  y += 6;

  // Table Header with Grid Style
  const colWidth = contentWidth / columns.length;
  doc.setFontSize(7);
  columns.forEach((col, i) => {
    doc.rect(margin + (i * colWidth), y, colWidth, 6, 'S');
    doc.text(col.toUpperCase(), margin + (i * colWidth) + 2, y + 4);
  });
  
  y += 6;
  doc.setFont('helvetica', 'normal');

  // Table Data
  data.forEach((row) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    
    const values = Object.values(row);
    values.forEach((val: any, i) => {
      doc.rect(margin + (i * colWidth), y, colWidth, 7, 'S');
      doc.text(String(val).substring(0, 30), margin + (i * colWidth) + 2, y + 5);
    });
    y += 7;
  });

  // Footer Section: FIRMA
  y = Math.max(y + 20, 240);
  doc.setFillColor(217, 233, 245);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.rect(margin, y, contentWidth, 6, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('RESPONSABLE DE EMISIÓN', pageWidth / 2, y + 4, { align: 'center' });
  
  y += 15;
  doc.setFontSize(8);
  doc.text('Firmado por:', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.text('SISTEMA AUTOMATIZADO FARMASALUD - MARCA REGISTRADA', pageWidth / 2, y, { align: 'center' });
  
  y += 10;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('01003-SEDE CENTRAL Calle Comercio #456 - La Paz, Bolivia', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('BARRIO CENTRAL - Teléfono: 2-2445566 - Web: http://www.farmasalud.com.bo', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('NIT 1020304050 - Código de Habilitación: 110010645319', pageWidth / 2, y, { align: 'center' });

  doc.save(`${filename}.pdf`);
};
