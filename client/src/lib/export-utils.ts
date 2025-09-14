import * as XLSX from 'xlsx';

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export interface ExportOptions {
  filename: string;
  format: 'csv' | 'xlsx';
  columns: ExportColumn[];
  data: any[];
  sheetName?: string;
}

/**
 * Format date for export
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleString();
}

/**
 * Format phone number for export
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';
  // Remove any formatting and ensure it starts with +
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.startsWith('1') ? `+${cleaned}` : `+${cleaned}`;
}

/**
 * Format array fields for export
 */
export function formatArray(arr: string[] | null | undefined): string {
  if (!arr || !Array.isArray(arr)) return '';
  return arr.join(', ');
}

/**
 * Format JSON object for export
 */
export function formatObject(obj: Record<string, any> | null | undefined): string {
  if (!obj || typeof obj !== 'object') return '';
  return Object.entries(obj)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

/**
 * Generate CSV content from data and columns
 */
export function generateCSV(columns: ExportColumn[], data: any[]): string {
  const headers = columns.map(col => col.label);
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      const formatted = col.format ? col.format(value) : String(value || '');
      // Escape quotes and wrap in quotes if contains comma or quotes
      if (formatted.includes(',') || formatted.includes('"') || formatted.includes('\n')) {
        return `"${formatted.replace(/"/g, '""')}"`;
      }
      return formatted;
    })
  );
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Generate Excel workbook from data and columns
 */
export function generateExcel(options: ExportOptions): XLSX.WorkBook {
  const { columns, data, sheetName = 'Data' } = options;
  
  // Create headers
  const headers = columns.map(col => col.label);
  
  // Create data rows
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      return col.format ? col.format(value) : value;
    })
  );
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Set column widths
  const columnWidths = columns.map(col => ({ width: Math.max(col.label.length, 15) }));
  worksheet['!cols'] = columnWidths;
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  return workbook;
}

/**
 * Download file to user's device
 */
export function downloadFile(content: string | XLSX.WorkBook, filename: string, format: 'csv' | 'xlsx'): void {
  if (format === 'csv') {
    const blob = new Blob([content as string], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } else {
    const buffer = XLSX.write(content as XLSX.WorkBook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

/**
 * Main export function
 */
export function exportData(options: ExportOptions): void {
  const { filename, format, columns, data } = options;
  
  if (data.length === 0) {
    throw new Error('No data to export');
  }
  
  try {
    if (format === 'csv') {
      const csvContent = generateCSV(columns, data);
      downloadFile(csvContent, filename, 'csv');
    } else {
      const workbook = generateExcel(options);
      downloadFile(workbook, filename, 'xlsx');
    }
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export data');
  }
}

/**
 * Get formatted timestamp for filenames
 */
export function getTimestamp(): string {
  return new Date().toISOString().split('T')[0];
}