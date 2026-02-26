// UUID fallback for older browsers
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// CSV Export utility
export interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((item: T) => string | number | null | undefined);
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Create CSV header
  const headers = columns.map(col => `"${col.header}"`).join(',');

  // Create CSV rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value: any;
      if (typeof col.accessor === 'function') {
        value = col.accessor(item);
      } else {
        value = item[col.accessor];
      }
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '""';
      }
      
      // Handle numbers
      if (typeof value === 'number') {
        return value.toString();
      }
      
      // Handle dates
      if (value instanceof Date) {
        return `"${value.toISOString()}"`;
      }
      
      // Escape quotes and wrap in quotes
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  });

  // Combine header and rows
  const csv = [headers, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Lead sorting utility
export interface Lead {
  score: number;
  value?: number;
}

export function sortLeads<T extends Lead>(
  leads: T[],
  sortBy: 'score' | 'value' | 'date'
): T[] {
  return [...leads].sort((a, b) => {
    if (sortBy === 'score') return b.score - a.score;
    if (sortBy === 'value') return (b.value || 0) - (a.value || 0);
    return 0;
  });
}
