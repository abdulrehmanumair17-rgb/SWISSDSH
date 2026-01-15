
export interface DepartmentMismatch {
  department: string;
  team?: string;
  metric: string;
  plan: number;
  actual: number;
  variance: number;
  unit: string;
  status: 'critical' | 'warning' | 'on-track';
  reasoning?: string;
  reportDate?: string; // Stored as the raw header string from Excel (e.g. "Thursday, January 01, 2026")
}

export interface SummaryReport {
  id: string;
  timestamp: string;
  executiveSummary: string;
  mismatches: DepartmentMismatch[];
  actionPoints: string[];
}

export interface ERPConnection {
  system: 'ERP' | 'MREP' | 'FINANCE';
  status: 'connected' | 'disconnected';
  lastFetch: string | null;
}

export type HolidaysMap = Record<string, number[]>; // key: "YYYY-MM"
export type LocksMap = Record<string, boolean>;    // key: "YYYY-MM"
