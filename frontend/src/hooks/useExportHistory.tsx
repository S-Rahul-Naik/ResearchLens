export interface ExportRecord {
  id: string;
  type: 'JSON' | 'PDF' | 'CSV';
  label: string;
  itemCount: number;
  section: string;
  timestamp: string;
}

const STORAGE_KEY = 'rl_export_history';

export function getExportHistory(): ExportRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function logExport(record: Omit<ExportRecord, 'id' | 'timestamp'>) {
  const history = getExportHistory();
  const newRecord: ExportRecord = {
    ...record,
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [newRecord, ...history].slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function clearExportHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
