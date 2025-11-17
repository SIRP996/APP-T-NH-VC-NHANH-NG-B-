
export interface Product {
  id: string;
  modelId: string;
  name: string;
  originalPrice: number;
  setPrice: number;
  finalPrice: number;
}

export enum VoucherType {
  Percentage = 'percentage',
  Fixed = 'fixed',
}

export interface ColumnMapping {
  id: string;
  modelId: string;
  name: string;
  finalPrice: string;
}

export interface DealList {
  id: string;
  name: string;
  sheetUrl: string;
  columnMapping: ColumnMapping;
  // FIX: Added lastSynced property to align with its usage in App.tsx
  lastSynced?: any;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
