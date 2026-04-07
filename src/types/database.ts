/**
 * Sovereign Database Schema Definitions
 */

export interface DatabaseRow {
  id: string;
  created_at: string;
}

export interface Supplier extends DatabaseRow {
  name: string;
  email?: string;
  phone?: string;
  vat_number?: string;
}

export interface ERPAsset extends DatabaseRow {
  name: string;
  category?: string;
  serial_number?: string;
  purchase_cost?: number;
  purchase_date?: string;
}

export interface AffiliatePartner extends DatabaseRow {
  name: string;
  type: string;
  status: string;
  members: number;
  commission: string;
  total_payout: number;
  email?: string;
  date?: string;
}

export interface MarketingCampaign extends DatabaseRow {
  name: string;
  type: string;
  status: string;
  budget: number;
  spent: number;
  revenue: number;
  leads: number;
  start_date: string;
  end_date: string;
}

export interface PurchaseOrder extends DatabaseRow {
  po_number?: string;
  ref?: string;
  vendor: string;
  supplier_id?: string | null;
  status: string;
  category?: string;
  total_amount: number;
  notes?: string;
  date?: string;
}

export interface AccountingBudget extends DatabaseRow {
  category: string;
  allocated: number;
  period_year: number;
  amount?: number;
  accounting_accounts?: { name: string };
}

export interface AccountingSettings extends DatabaseRow {
  purchase_account_id: string;
  vat_account_id: string;
}

export interface AccountingAccount extends DatabaseRow {
  code: string;
  name: string;
}

export interface AccountingTransaction extends DatabaseRow {
  description: string;
  reference_no?: string;
  metadata?: Record<string, unknown>;
}

export interface AccountingJournalEntry extends DatabaseRow {
  transaction_id: string;
  account_id: string;
  debit: number;
  credit: number;
  vat_rate?: number;
  vat_amount?: number;
}

export interface RestockRequest extends DatabaseRow {
  asset_name: string;
  quantity: number;
  priority: string;
  status: string;
}
