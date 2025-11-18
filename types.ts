

export interface Product {
  id: string;
  exclusiveId?: string;
  modelId?: string;
  name: string;
  originalPrice: number;
  displayPrice: number;
  finalPrice: string;
  gift?: string;
}

export enum VoucherType {
  Percentage = 'percentage',
  Fixed = 'fixed',
}

export interface ColumnMapping {
  id: string;
  exclusiveId?: string;
  modelId?: string;
  name:string;
  displayPrice: string;
  finalPrice: string;
  gift?: string;
}

export interface DealList {
  id: string;
  name: string;
  sheetUrl?: string; // Made optional for Excel imports
  columnMapping: ColumnMapping;
  lastSynced?: any;
  source?: 'google-sheet' | 'excel'; // To distinguish the data source
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}