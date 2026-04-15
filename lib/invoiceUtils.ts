
import { jsPDF } from 'jspdf';
import { SaleRecord } from '../types';

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
 * Generates a Bolivian style invoice PDF (Ticket Style 80mm)
 */
export const generateBolivianInvoice = (sale: SaleRecord, currencySymbol: string) => {
  const width = 80; // 80mm standard thermal paper
  const height = 180 + (sale.items.length * 10);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [width, height]
  });

  const margin = 5;
  let y = 10;

  // Header - Business Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FARMASALUD S.R.L.', width / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Casa Matriz: Calle Comercio #456', width / 2, y, { align: 'center' });
  y += 3;
  doc.text('Teléfono: 2-2445566', width / 2, y, { align: 'center' });
  y += 3;
  doc.text('La Paz - Bolivia', width / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA', width / 2, y, { align: 'center' });
  y += 5;

  // Invoice Metadata
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIT: 1020304050`, width / 2, y, { align: 'center' });
  y += 3;
  doc.text(`N° FACTURA: ${sale.id.replace(/\D/g, '').substring(0, 6)}`, width / 2, y, { align: 'center' });
  y += 3;
  doc.text(`N° AUTORIZACIÓN: 29040011007`, width / 2, y, { align: 'center' });
  y += 6;

  doc.setLineDashPattern([0.5, 0.5], 0);
  doc.line(margin, y, width - margin, y);
  y += 5;

  // Customer Info
  doc.setFont('helvetica', 'bold');
  doc.text('FECHA:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(sale.timestamp).toLocaleString(), margin + 12, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('NOMBRE/RAZÓN SOCIAL:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.customerName || 'SIN NOMBRE', margin + 35, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('NIT/CI:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text('1234567', margin + 12, y); // Placeholder NIT
  y += 6;

  doc.line(margin, y, width - margin, y);
  y += 5;

  // Items Table
  doc.setFont('helvetica', 'bold');
  doc.text('CANT', margin, y);
  doc.text('DETALLE', margin + 10, y);
  doc.text('P.UNIT', width - 20, y, { align: 'right' });
  doc.text('SUBTOTAL', width - margin, y, { align: 'right' });
  y += 4;
  doc.setFont('helvetica', 'normal');

  sale.items.forEach(item => {
    const name = item.medication.name.substring(0, 25);
    doc.text(item.quantity.toString(), margin, y);
    doc.text(name, margin + 10, y);
    doc.text((item.subtotal / item.quantity).toFixed(2), width - 20, y, { align: 'right' });
    doc.text(item.subtotal.toFixed(2), width - margin, y, { align: 'right' });
    y += 4;
  });

  y += 2;
  doc.line(margin, y, width - margin, y);
  y += 5;

  // Totals
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL BS.', margin, y);
  doc.text(sale.total.toFixed(2), width - margin, y, { align: 'right' });
  y += 6;

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(numberToWords(sale.total), margin, y);
  y += 8;

  // Control Code & Expiry
  doc.setFontSize(7);
  doc.text('CÓDIGO DE CONTROL: 6A-7B-8C-9D', margin, y);
  y += 4;
  doc.text('FECHA LÍMITE DE EMISIÓN: 31/12/2026', margin, y);
  y += 8;

  // QR Code Placeholder
  doc.rect(width / 2 - 10, y, 20, 20);
  doc.setFontSize(5);
  doc.text('ESPACIO PARA QR', width / 2, y + 10, { align: 'center' });
  y += 25;

  // Legend
  doc.setFontSize(6);
  doc.text('"ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO DE ÉSTA SERÁ SANCIONADO DE ACUERDO A LA LEY"', width / 2, y, { align: 'center', maxWidth: 70 });
  y += 6;
  doc.text('Ley N° 453: El proveedor deberá suministrar el servicio en las condiciones acordadas.', width / 2, y, { align: 'center', maxWidth: 70 });

  doc.save(`Factura_Bolivia_${sale.id}.pdf`);
};

export const exportSalesToExcel = (sales: SaleRecord[], filename: string) => {
  const data = sales.map(sale => ({
    'ID Venta': sale.id,
    'Fecha': new Date(sale.timestamp).toLocaleDateString(),
    'Hora': new Date(sale.timestamp).toLocaleTimeString(),
    'Paciente': sale.customerName,
    'Vendedor': sale.userId,
    'Seguro': sale.insuranceName,
    'Items': sale.items.length,
    'Total': sale.total
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
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
