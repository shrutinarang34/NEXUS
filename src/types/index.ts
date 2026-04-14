

import type { Timestamp } from 'firebase/firestore';

export interface Expense {
  id: string;
  userId: string;
  name: string;
  amount: number;
  date: Timestamp;
  categoryId: string;
  accountId?: string;
  createdAt: Timestamp;
  cashbackAmount?: number;
  recurringItemId?: string; // Link to the recurring item
  isImported?: boolean;
}

export interface Category {
  id:string;
  name: string;
  icon?: string;
  type?: 'Need' | 'Want' | 'Uncategorized';
  showInHeatmap?: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: 'Bank Account' | 'Credit Account';
  icon?: string;
  balance: number;
  isDefault?: boolean;
  cashbackPercentage?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'Deposit' | 'Withdrawal' | 'Transfer';
  amount: number;
  date: Timestamp;
  fromAccountId?: string;
  toAccountId?: string;
  description: string;
  createdAt: Timestamp;
  recurringItemId?: string; // Link to the recurring item
}

export interface Budget {
    id: string;
    userId: string;
    name: string;
    amount: number;
    period: 'monthly' | 'yearly' | 'custom';
    startDate: Timestamp;
    endDate: Timestamp;
    allocations: Array<{
        categoryId: string;
        amount: number;
    }>;
    createdAt: Timestamp;
}

export interface Person {
    id: string;
    userId: string;
    name: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    currentBalance: number;
    createdAt: Timestamp;
}

export interface HouseholdUser {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    isDefault: boolean;
}


export interface LoanTransaction {
    id: string;
    personId: string;
    accountId: string;
    type: 'lent' | 'repayment_received' | 'borrowed' | 'repayment_made';
    amount: number;
    date: Timestamp;
    notes?: string;
    createdAt: Timestamp;
}

export type DefaultDateRange = 'this_month' | 'last_30_days' | 'ytd';

export interface UserSettings {
    isProUser?: boolean;
    lastLogin?: Timestamp | null;
    featureFlags: {
        loans: boolean;
        budgets: boolean;
        transactions: boolean;
        aiInsights: boolean;
        recurring: boolean;
        [key: string]: boolean; // For dynamic access
    };
    security?: {
        is2faEnabled: boolean;
        otpSecret?: string;
        otpLastSent?: Timestamp;
    },
    defaultDateRange?: DefaultDateRange;
    currency?: string;
}

// Union type for the combined list on the transactions page
export type LedgerItem = (Expense & { itemType: 'expense' }) | (Transaction & { itemType: 'transaction' });

export interface RecurringItem {
  id: string;
  userId: string;
  name: string;
  type: 'expense' | 'transaction';
  transactionType?: 'Deposit' | 'Withdrawal'; // Only for transactions
  amount: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  startDate: Timestamp;
  endDate?: Timestamp | null; // Can be null
  nextDueDate: Timestamp;
  categoryId?: string; // For expenses
  accountId: string; // Used for from/to depending on type
  toAccountId?: string; // Only for transfers
  isActive: boolean;
  createdAt: Timestamp;
}
