import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';

export const exportDocumentToDocx = async (title, htmlContent) => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: htmlContent ? htmlContent.replace(/<[^>]+>/g, ' ') : '', 
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
};

export const exportSpreadsheetToXlsx = async (title, sheetsData) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SSPL-TaskFlow';
  
  if (sheetsData && sheetsData.sheets) {
    for (const [sheetId, sheet] of Object.entries(sheetsData.sheets)) {
      const worksheet = workbook.addWorksheet(sheet.name || sheetId);
      
      if (sheet.cellData) {
        for (const [rowIndex, row] of Object.entries(sheet.cellData)) {
          for (const [colIndex, cell] of Object.entries(row)) {
            if (cell && cell.v !== undefined) {
              const r = parseInt(rowIndex, 10) + 1;
              const c = parseInt(colIndex, 10) + 1;
              worksheet.getCell(r, c).value = cell.v;
            }
          }
        }
      }
    }
  } else {
    workbook.addWorksheet('Sheet1');
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

export const importDocxToHtml = async (buffer) => {
  const result = await mammoth.convertToHtml({ buffer });
  return { html: result.value, messages: result.messages };
};

export const importXlsxToSheetData = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const sheets = {};
  
  workbook.eachSheet((worksheet, sheetId) => {
    const cellData = {};
    
    worksheet.eachRow((row, rowNumber) => {
      const r = rowNumber - 1;
      cellData[r] = {};
      
      row.eachCell((cell, colNumber) => {
        const c = colNumber - 1;
        cellData[r][c] = { v: cell.value };
      });
    });
    
    const sId = `sheet${sheetId}`;
    sheets[sId] = {
      id: sId,
      name: worksheet.name,
      cellData,
      rowCount: worksheet.rowCount > 100 ? worksheet.rowCount : 100,
      columnCount: worksheet.columnCount > 26 ? worksheet.columnCount : 26
    };
  });
  
  return { sheets };
};
