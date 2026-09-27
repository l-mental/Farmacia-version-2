import { jsPDF } from 'jspdf';
import { Medication, PharmacyInfo } from '@/types';
import { DEFAULT_PHARMACY_INFO } from '@/constants';

export interface CriticalInventoryItem {
  id: string;
  name: string;
  genericName?: string;
  laboratory?: string;
  category?: string;
  lotNumber?: string;
  expiryDate?: string;
  daysToExpiry?: number | null;
  stockBoxes: number;
  minStock: number;
  stockUnits: number;
  unitsPerBox: number;
  type: 'EXPIRED' | 'SHORT_EXPIRY' | 'LOW_STOCK';
}

export const getCriticalItems = (medications: Medication[]): {
  expired: CriticalInventoryItem[];
  shortExpiry: CriticalInventoryItem[];
  lowStock: CriticalInventoryItem[];
  all: CriticalInventoryItem[];
} => {
  const now = new Date().getTime();

  const expired: CriticalInventoryItem[] = [];
  const shortExpiry: CriticalInventoryItem[] = [];
  const lowStock: CriticalInventoryItem[] = [];

  medications.forEach(m => {
    const primaryBatch = m.batches?.[0];
    const expStr = primaryBatch?.expiryDate;
    let days: number | null = null;
    let isExpired = false;
    let isShort = false;

    if (expStr) {
      const expTime = new Date(expStr).getTime();
      if (!isNaN(expTime)) {
        days = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
        if (expTime < now) {
          isExpired = true;
        } else if (days <= 90) {
          isShort = true;
        }
      }
    }

    const isLow = m.stockBoxes <= m.minStock;

    if (isExpired) {
      expired.push({
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        laboratory: m.laboratory,
        category: m.category,
        lotNumber: primaryBatch?.lotNumber || 'S/L',
        expiryDate: expStr || 'S/F',
        daysToExpiry: days,
        stockBoxes: m.stockBoxes,
        minStock: m.minStock,
        stockUnits: m.stockUnits,
        unitsPerBox: m.unitsPerBox,
        type: 'EXPIRED'
      });
    } else if (isShort) {
      shortExpiry.push({
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        laboratory: m.laboratory,
        category: m.category,
        lotNumber: primaryBatch?.lotNumber || 'S/L',
        expiryDate: expStr || 'S/F',
        daysToExpiry: days,
        stockBoxes: m.stockBoxes,
        minStock: m.minStock,
        stockUnits: m.stockUnits,
        unitsPerBox: m.unitsPerBox,
        type: 'SHORT_EXPIRY'
      });
    }

    if (isLow) {
      lowStock.push({
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        laboratory: m.laboratory,
        category: m.category,
        lotNumber: primaryBatch?.lotNumber || 'S/L',
        expiryDate: expStr || 'S/F',
        daysToExpiry: days,
        stockBoxes: m.stockBoxes,
        minStock: m.minStock,
        stockUnits: m.stockUnits,
        unitsPerBox: m.unitsPerBox,
        type: 'LOW_STOCK'
      });
    }
  });

  return {
    expired,
    shortExpiry,
    lowStock,
    all: [...expired, ...shortExpiry, ...lowStock]
  };
};

/**
 * Triggers a professional print report for expired and low stock products
 */
export const printCriticalInventoryReport = (
  medications: Medication[], 
  pharmacyInfo: PharmacyInfo = DEFAULT_PHARMACY_INFO
) => {
  const { expired, shortExpiry, lowStock } = getCriticalItems(medications);
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-BO', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  const timeFormatted = now.toLocaleTimeString('es-BO', { 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor habilita las ventanas emergentes en tu navegador para imprimir la lista.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Lista Crítica - Farmacia Yireh (SoftPlus)</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.4;
        }
        .header {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .pharmacy-title {
          font-size: 20px;
          font-weight: 900;
          color: #065f46;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .subtitle {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 2px;
        }
        .brand-badge {
          font-size: 9px;
          color: #64748b;
          font-weight: bold;
        }
        .meta-box {
          text-align: right;
          font-size: 10px;
          color: #475569;
        }
        .meta-box strong {
          color: #0f172a;
        }
        .stats-grid {
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
        }
        .stat-card {
          flex: 1;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .stat-card.danger {
          border-color: #fecdd3;
          background: #fff1f2;
        }
        .stat-card.warning {
          border-color: #fed7aa;
          background: #fffbeb;
        }
        .stat-card.short {
          border-color: #fef08a;
          background: #fefce8;
        }
        .stat-num {
          font-size: 18px;
          font-weight: 900;
          margin: 0;
        }
        .stat-label {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          color: #475569;
        }
        h2.section-title {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          margin: 16px 0 8px 0;
          padding: 4px 8px;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .title-danger {
          background: #ffe4e6;
          color: #9f1239;
          border-left: 4px solid #e11d48;
        }
        .title-warning {
          background: #ffedd5;
          color: #9a3412;
          border-left: 4px solid #ea580c;
        }
        .title-short {
          background: #fef9c3;
          color: #854d0e;
          border-left: 4px solid #ca8a04;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        th {
          background: #f1f5f9;
          color: #334155;
          font-weight: 800;
          font-size: 9px;
          text-transform: uppercase;
          padding: 6px 8px;
          text-align: left;
          border-bottom: 1px solid #cbd5e1;
        }
        td {
          padding: 6px 8px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 10px;
        }
        tr:nth-child(even) td {
          background: #fafafa;
        }
        .pill {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .pill-danger { background: #ffe4e6; color: #9f1239; }
        .pill-warning { background: #ffedd5; color: #9a3412; }
        .pill-short { background: #fef9c3; color: #854d0e; }
        .empty-notice {
          padding: 12px;
          text-align: center;
          color: #64748b;
          font-style: italic;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px dashed #cbd5e1;
        }
        .footer {
          margin-top: 24px;
          border-top: 1px solid #cbd5e1;
          padding-top: 12px;
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #64748b;
        }
        .signatures {
          margin-top: 30px;
          display: flex;
          justify-content: space-around;
        }
        .sig-box {
          border-top: 1px solid #475569;
          width: 180px;
          text-align: center;
          padding-top: 4px;
          font-size: 9px;
          font-weight: bold;
          color: #334155;
        }
        @media print {
          .no-print { display: none; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="background: #0f172a; color: white; padding: 10px 16px; margin-bottom: 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>Vista previa para imprimir</strong> - Lista de productos críticos (Vencidos y Bajo Stock)
        </div>
        <div>
          <button onclick="window.print()" style="background: #10b981; color: #022c22; font-weight: bold; padding: 6px 14px; border: none; border-radius: 6px; cursor: pointer; margin-right: 8px;">
            🖨️ Imprimir Ahora
          </button>
          <button onclick="window.close()" style="background: rgba(255,255,255,0.2); color: white; font-weight: bold; padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer;">
            Cerrar
          </button>
        </div>
      </div>

      <div class="header">
        <div>
          <h1 class="pharmacy-title">${pharmacyInfo.commercialName || pharmacyInfo.name || 'FARMACIA YIREH'}</h1>
          <div class="subtitle">REPORTE OFICIAL DE ALERTAS DE INVENTARIO Y REPOSICIÓN</div>
          <div class="brand-badge">Sistema FarmaPOS • Desarrollado por SoftPlus</div>
          <div style="font-size: 9px; color: #475569; margin-top: 3px;">
            ${pharmacyInfo.address || 'Av. Principal'} • ${pharmacyInfo.city || 'Bolivia'} • NIT: ${pharmacyInfo.nit || '1020304050'}
          </div>
        </div>
        <div class="meta-box">
          <div><strong>Fecha de emisión:</strong> ${dateFormatted}</div>
          <div><strong>Hora de emisión:</strong> ${timeFormatted}</div>
          <div><strong>Responsable:</strong> Farmacéutico / Administrador</div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card danger">
          <div class="stat-num" style="color: #e11d48;">${expired.length}</div>
          <div class="stat-label">Vencidos (Retiro Urgente)</div>
        </div>
        <div class="stat-card short">
          <div class="stat-num" style="color: #ca8a04;">${shortExpiry.length}</div>
          <div class="stat-label">Vencimiento Corto (&lt; 90 Días)</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-num" style="color: #ea580c;">${lowStock.length}</div>
          <div class="stat-label">Bajo Stock (Reabastecer)</div>
        </div>
      </div>

      <!-- SECCIÓN 1: VENCIDOS -->
      <h2 class="section-title title-danger">
        <span>🚨 1. Productos Vencidos (${expired.length})</span>
        <span style="font-size: 9px; font-weight: normal;">Debe retirarse de estanterías de inmediato</span>
      </h2>
      ${expired.length === 0 ? `
        <div class="empty-notice">¡Excelente! No hay ningún medicamento vencido en el inventario.</div>
      ` : `
        <table>
          <thead>
            <tr>
              <th style="width: 28%;">Medicamento</th>
              <th style="width: 22%;">Principio Activo</th>
              <th style="width: 14%;">Laboratorio</th>
              <th style="width: 12%;">N° Lote</th>
              <th style="width: 12%;">Venció</th>
              <th style="width: 12%; text-align: right;">Stock Físico</th>
            </tr>
          </thead>
          <tbody>
            ${expired.map(item => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.genericName || '-'}</td>
                <td>${item.laboratory || '-'}</td>
                <td><code style="font-size: 9px; font-weight: bold;">${item.lotNumber}</code></td>
                <td><span class="pill pill-danger">${item.expiryDate}</span></td>
                <td style="text-align: right; font-weight: bold; color: #e11d48;">
                  ${item.stockBoxes} cjs (${item.stockUnits} uds)
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}

      <!-- SECCIÓN 2: VENCIMIENTO CORTO -->
      <h2 class="section-title title-short">
        <span>⏳ 2. Productos con Vencimiento Próximo (&lt; 90 Días) (${shortExpiry.length})</span>
        <span style="font-size: 9px; font-weight: normal;">Priorizar para rotación FEFO / Liquidación</span>
      </h2>
      ${shortExpiry.length === 0 ? `
        <div class="empty-notice">No hay medicamentos con fecha de vencimiento menor a 90 días.</div>
      ` : `
        <table>
          <thead>
            <tr>
              <th style="width: 28%;">Medicamento</th>
              <th style="width: 22%;">Principio Activo</th>
              <th style="width: 14%;">Laboratorio</th>
              <th style="width: 12%;">N° Lote</th>
              <th style="width: 12%;">Vence en</th>
              <th style="width: 12%; text-align: right;">Stock Actual</th>
            </tr>
          </thead>
          <tbody>
            ${shortExpiry.map(item => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.genericName || '-'}</td>
                <td>${item.laboratory || '-'}</td>
                <td><code style="font-size: 9px; font-weight: bold;">${item.lotNumber}</code></td>
                <td><span class="pill pill-short">${item.expiryDate} (${item.daysToExpiry !== null ? item.daysToExpiry + 'd' : ''})</span></td>
                <td style="text-align: right; font-weight: bold; color: #854d0e;">
                  ${item.stockBoxes} cjs
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}

      <!-- SECCIÓN 3: BAJO STOCK -->
      <h2 class="section-title title-warning">
        <span>⚠️ 3. Productos con Stock Crítico o Agotados (${lowStock.length})</span>
        <span style="font-size: 9px; font-weight: normal;">Generar orden de compra a proveedores</span>
      </h2>
      ${lowStock.length === 0 ? `
        <div class="empty-notice">¡Todo el inventario cuenta con stock por encima del nivel mínimo!</div>
      ` : `
        <table>
          <thead>
            <tr>
              <th style="width: 30%;">Medicamento</th>
              <th style="width: 20%;">Laboratorio</th>
              <th style="width: 15%; text-align: center;">Stock Actual</th>
              <th style="width: 15%; text-align: center;">Stock Mínimo</th>
              <th style="width: 20%; text-align: right;">Cajas a Pedir (Mín.)</th>
            </tr>
          </thead>
          <tbody>
            ${lowStock.map(item => {
              const diff = Math.max(1, (item.minStock * 2) - item.stockBoxes);
              return `
                <tr>
                  <td><strong>${item.name}</strong><br><small style="color: #64748b;">${item.genericName || ''}</small></td>
                  <td>${item.laboratory || '-'}</td>
                  <td style="text-align: center; font-weight: 900; color: ${item.stockBoxes === 0 ? '#e11d48' : '#ea580c'};">
                    ${item.stockBoxes === 0 ? 'AGOTADO (0 cjs)' : `${item.stockBoxes} cjs`}
                  </td>
                  <td style="text-align: center; color: #475569; font-weight: bold;">
                    ${item.minStock} cjs
                  </td>
                  <td style="text-align: right; font-weight: 900; color: #047857;">
                    +${diff} cjs
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `}

      <div class="signatures">
        <div class="sig-box">
          Firma Responsable Farmacéutico
        </div>
        <div class="sig-box">
          Firma Encargado de Compras
        </div>
      </div>

      <div class="footer">
        <div>Farmacia Yireh • Software FarmaPOS v2.5 por SoftPlus</div>
        <div>Página 1 de 1 • Generado automáticamente</div>
      </div>

      <script>
        window.onload = function() {
          // Auto-prompt print after render
          setTimeout(() => {
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Alternative PDF download for critical alerts report
 */
export const downloadCriticalInventoryPDF = (
  medications: Medication[], 
  pharmacyInfo: PharmacyInfo = DEFAULT_PHARMACY_INFO
) => {
  const { expired, shortExpiry, lowStock } = getCriticalItems(medications);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text(pharmacyInfo.commercialName || pharmacyInfo.name || 'FARMACIA YIREH', 15, y);
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('LISTA CRÍTICA DE INVENTARIO (VENCIDOS Y BAJO STOCK)', 15, y);
  y += 4;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Desarrollado por SoftPlus | Fecha: ${new Date().toLocaleString('es-BO')}`, 15, y);
  y += 8;

  // Stats row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(225, 29, 72);
  doc.text(`Vencidos: ${expired.length}`, 15, y);
  doc.setTextColor(202, 138, 4);
  doc.text(`Por vencer (<90d): ${shortExpiry.length}`, 65, y);
  doc.setTextColor(234, 88, 12);
  doc.text(`Bajo stock: ${lowStock.length}`, 135, y);
  y += 8;

  // Vencidos section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(159, 18, 57);
  doc.text('1. PRODUCTOS VENCIDOS', 15, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  if (expired.length === 0) {
    doc.text('Sin medicamentos vencidos.', 15, y);
    y += 6;
  } else {
    expired.slice(0, 20).forEach(m => {
      doc.text(`• ${m.name} | Lote: ${m.lotNumber} | Vto: ${m.expiryDate} | Stock: ${m.stockBoxes} cjs`, 15, y);
      y += 4.5;
    });
    y += 4;
  }

  // Bajo stock section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(154, 52, 18);
  doc.text('2. PRODUCTOS CON BAJO STOCK / AGOTADOS', 15, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  if (lowStock.length === 0) {
    doc.text('Todo el inventario se encuentra por encima del stock mínimo.', 15, y);
    y += 6;
  } else {
    lowStock.slice(0, 25).forEach(m => {
      doc.text(`• ${m.name} | Stock Actual: ${m.stockBoxes} cjs (Mín: ${m.minStock}) | Lab: ${m.laboratory || '-'}`, 15, y);
      y += 4.5;
    });
  }

  doc.save(`Farmacia_Yireh_Lista_Critica_${new Date().toISOString().split('T')[0]}.pdf`);
};
