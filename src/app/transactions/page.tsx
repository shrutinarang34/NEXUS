

"use client";

import { useState, useMemo, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getExpenses, getTransactions, getCategories, getAccounts, getUserSettings } from "@/lib/firestore";
import type { Expense, Transaction, Category, Account, LedgerItem, UserSettings } from "@/types";
import { PlusCircle, Banknote } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { ExpenseForm } from "@/components/dashboard/ExpenseForm";
import { useRouter } from "next/navigation";

export default function TransactionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTxFormOpen, setIsTxFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);

  useEffect(() => {
    if (user) {
      getUserSettings(user.uid).then(userSettings => {
        if (!userSettings?.featureFlags.transactions) {
          router.push('/');
        } else {
          setSettings(userSettings);
          fetchAndSetData();
        }
      });
    }
  }, [user, router]);


  const fetchAndSetData = async () => {
    if (user) {
      setLoading(true);
      const [
        userExpenses,
        userTransactions,
        userCategories,
        userAccounts,
      ] = await Promise.all([
        getExpenses(user.uid),
        getTransactions(user.uid),
        getCategories(user.uid),
        getAccounts(user.uid),
      ]);
      setExpenses(userExpenses);
      setTransactions(userTransactions);
      setCategories(userCategories);
      setAccounts(userAccounts);
      setLoading(false);
    }
  };

  const ledgerItems = useMemo(() => {
    const combined: LedgerItem[] = [
      ...expenses.map((e) => ({ ...e, itemType: 'expense' as const })),
      ...transactions.map((t) => ({ ...t, itemType: 'transaction' as const })),
    ];
    combined.sort((a, b) => b.date.toMillis() - a.date.toMillis());
    return combined;
  }, [expenses, transactions]);


  const onFormSubmit = () => {
    fetchAndSetData();
    setIsTxFormOpen(false);
    setIsExpenseFormOpen(false);
  }
  
  if (!settings) {
    return <AppShell><Skeleton className="h-96 w-full" /></AppShell>;
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Transactions</h1>
            <p className="text-muted-foreground">
              A complete history of your expenses and transactions.
            </p>
          </div>
          <div className="flex gap-2">
              <Button onClick={() => setIsTxFormOpen(true)}>
                <Banknote className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
              <Button onClick={() => setIsExpenseFormOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </div>
        </header>
        
        {loading ? (
          <Skeleton className="h-96" />
        ) : (
          <TransactionList 
            items={ledgerItems}
            categories={categories}
            accounts={accounts}
            onDataChanged={fetchAndSetData}
          />
        )}
      </div>
      <TransactionForm
        isOpen={isTxFormOpen}
        onOpenChange={setIsTxFormOpen}
        accounts={accounts}
        onFormSubmit={onFormSubmit}
      />
      <ExpenseForm
        isOpen={isExpenseFormOpen}
        onOpenChange={setIsExpenseFormOpen}
        categories={categories}
        accounts={accounts}
        onFormSubmit={onFormSubmit}
      />
    </AppShell>
  );
}
