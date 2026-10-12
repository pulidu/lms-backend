import PDFDocument from 'pdfkit';

export interface IPdfReportData {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  summaryFields?: { label: string; value: string }[];
}

export const generatePdfReport = (data: IPdfReportData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Primary theme color (Ocean Blue)
      const primaryColor = '#0284c7';
      const textColor = '#1e293b';
      const lightGray = '#f1f5f9';

      // Document Title Header
      doc.rect(0, 0, 595.28, 80).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(data.title, 40, 28);
      if (data.subtitle) {
        doc.fillColor('#e0f2fe').fontSize(11).font('Helvetica').text(data.subtitle, 40, 54);
      }

      let currentY = 110;

      // Summary Info Box
      if (data.summaryFields && data.summaryFields.length > 0) {
        doc.rect(40, currentY, 515, 60).fill('#f8fafc');
        doc.rect(40, currentY, 515, 60).stroke('#cbd5e1');

        let xOffset = 60;
        doc.fillColor(textColor).font('Helvetica');
        data.summaryFields.forEach((field) => {
          doc.fontSize(9).fillColor('#64748b').text(field.label, xOffset, currentY + 15);
          doc.fontSize(11).font('Helvetica-Bold').fillColor(textColor).text(field.value, xOffset, currentY + 30);
          xOffset += 150;
        });
        currentY += 80;
      }

      // Drawing Table Grid
      const tableWidth = 515;
      const colCount = data.headers.length;
      const colWidth = tableWidth / colCount;

      // Header row
      doc.rect(40, currentY, tableWidth, 25).fill(primaryColor);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10);
      
      data.headers.forEach((header, idx) => {
        doc.text(header, 45 + idx * colWidth, currentY + 8, { width: colWidth - 10, align: 'left' });
      });
      currentY += 25;

      // Row elements
      doc.font('Helvetica').fontSize(9);
      data.rows.forEach((row, rIdx) => {
        // Background striping
        if (rIdx % 2 === 1) {
          doc.rect(40, currentY, tableWidth, 22).fill(lightGray);
        } else {
          doc.rect(40, currentY, tableWidth, 22).fill('#ffffff');
        }

        doc.fillColor(textColor);
        row.forEach((cell, cIdx) => {
          doc.text(cell || '', 45 + cIdx * colWidth, currentY + 7, { width: colWidth - 10, align: 'left' });
        });

        // Bottom border line for row
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, currentY + 22).lineTo(555, currentY + 22).stroke();
        currentY += 22;

        // Page boundary check
        if (currentY > 740) {
          doc.addPage();
          currentY = 40;
        }
      });

      // Footer pagination note
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
          `Generated on ${new Date().toLocaleDateString()} | Page ${i + 1} of ${pages.count}`,
          40,
          800,
          { align: 'center', width: 515 }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
