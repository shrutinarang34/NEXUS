
"use client";

import { useState, useMemo, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ExpensesDataTable } from "@/components/dashboard/ExpensesDataTable";
import { useAuth } from "@/lib/auth";
import { getExpenses, getCategories, getAccounts, getUserSettings } from "@/lib/firestore";
import type { Expense, Category, Account, DefaultDateRange, UserSettings } from "@/types";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfDay, startOfYear, sub } from "date-fns";
import { PlusCircle, FileDown, Search, Import } from "lucide-react";
import { ExpenseForm } from "@/components/dashboard/ExpenseForm";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCsv } from "@/lib/csv";
import { MultiSelectFilter } from "@/components/dashboard/MultiSelectFilter";
import { Input } from "@/components/ui/input";
import { gtagEvent } from "@/lib/analytics";
import Link from "next/link";

const getDefaultDateRange = (rangeName?: DefaultDateRange): DateRange => {
  const now = new Date();
  switch (rangeName) {
    case 'this_month':
      return { from: startOfMonth(now), to: endOfDay(now) };
    case 'last_30_days':
      return { from: startOfDay(sub(now, { days: 29 })), to: endOfDay(now) };
    case 'ytd':
    default:
      return { from: startOfYear(now), to: endOfDay(now) };
  }
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAndSetData = async () => {
    if (user) {
      setLoading(true);
      const [userExpenses, userCategories, userAccounts, userSettings] = await Promise.all([
        getExpenses(user.uid),
        getCategories(user.uid),
        getAccounts(user.uid),
        getUserSettings(user.uid)
      ]);
      setExpenses(userExpenses);
      setCategories(userCategories);
      setAccounts(userAccounts);
      setSettings(userSettings);
      setDateRange(getDefaultDateRange(userSettings?.defaultDateRange));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndSetData();
  }, [user]);

  const filteredExpenses = useMemo(() => {
    // Sort by date descending first
    const sorted = [...expenses].sort((a, b) => b.date.toMillis() - a.date.toMillis());

    return sorted.filter(expense => {
      // Date filter
      if (dateRange?.from) {
        const from = dateRange.from;
        const to = dateRange.to ? endOfDay(dateRange.to) : new Date();
        const expenseDate = expense.date.toDate();
        if (expenseDate < from || expenseDate > to) {
          return false;
        }
      }
      
      // Category filter
      if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(expense.categoryId)) {
        return false;
      }
      
      // Account filter
      if (selectedAccountIds.length > 0 && (!expense.accountId || !selectedAccountIds.includes(expense.accountId))) {
        return false;
      }
      
      // Search term filter
      if (searchTerm && !expense.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [expenses, dateRange, selectedCategoryIds, selectedAccountIds, searchTerm]);

  const handleExport = () => {
    gtagEvent({ action: 'export_csv', category: 'Expense', label: 'Expenses Export' });
    const dataToExport = filteredExpenses.map(e => ({
      name: e.name,
      amount: e.amount,
      date: e.date.toDate().toLocaleDateString(),
      category: categories.find(c => c.id === e.categoryId)?.name || 'N/A',
      account: accounts.find(a => a.id === e.accountId)?.name || 'N/A',
    }));
    exportToCsv("expenses.csv", dataToExport);
  };

  const onFormSubmit = () => {
    fetchAndSetData();
    setIsFormOpen(false);
  }

  const categoryOptions = useMemo(() => categories.map(c => ({ value: c.id, label: c.name, icon: c.icon })), [categories]);
  const accountOptions = useMemo(() => accounts.map(a => ({ value: a.id, label: a.name, icon: a.icon })), [accounts]);

  const isProUser = settings?.isProUser ?? false;

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col items-start gap-4">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-headline">Expenses</h1>
              <p className="text-muted-foreground">
                View and manage your expenses.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isProUser && (
                <>
                  <Link href="/import">
                    <Button variant="outline">
                      <Import className="mr-2 h-4 w-4" />
                      Import
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={handleExport} disabled={loading || filteredExpenses.length === 0}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </>
              )}
              <Button onClick={() => setIsFormOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </div>
          </div>
          <div className="w-full flex flex-col sm:flex-row flex-wrap items-center gap-2">
             <DateRangePicker
              range={dateRange}
              onRangeChange={setDateRange}
              align="start"
            />
            <div className="flex flex-grow sm:flex-grow-0 flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <MultiSelectFilter
                    title="Categories"
                    options={categoryOptions}
                    selectedValues={selectedCategoryIds}
                    onSelectedChange={setSelectedCategoryIds}
                />
                <MultiSelectFilter
                    title="Accounts"
                    options={accountOptions}
                    selectedValues={selectedAccountIds}
                    onSelectedChange={setSelectedAccountIds}
                />
            </div>
            <div className="relative w-full sm:w-auto flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search expenses..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
        </header>
        
        {loading ? (
          <Skeleton className="h-96" />
        ) : (
          <ExpensesDataTable 
            data={filteredExpenses}
            categories={categories}
            accounts={accounts}
            onDataChanged={fetchAndSetData}
          />
        )}
      </div>
      <ExpenseForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        categories={categories}
        accounts={accounts}
        onFormSubmit={onFormSubmit}
      />
    </AppShell>
  );
}
