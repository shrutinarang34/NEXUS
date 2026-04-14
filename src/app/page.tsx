

"use client";

import * as React from "react";
import { useState, useMemo, useEffect, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ExpenseCharts } from "@/components/dashboard/ExpenseCharts";
import { useAuth } from "@/lib/auth";
import { getExpenses, getAccounts as getAccountsFromDb, getCategories as getCategoriesFromDb, getTransactions, getUserSettings, getBudgets, processRecurringItems } from "@/lib/firestore";
import { getPersons } from "@/lib/loans";
import type { Expense, Category, Account, Transaction, LedgerItem, Person, UserSettings, Budget, DefaultDateRange } from "@/types";
import { DateRange } from "react-day-picker";
import { addDays, startOfMonth, endOfMonth, startOfYear, subMonths, subYears, isSameDay, format, sub, endOfDay, differenceInDays } from "date-fns";
import { PlusCircle, Banknote, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { ExpenseForm } from "@/components/dashboard/ExpenseForm";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/StatCard";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MultiSelectFilter } from "@/components/dashboard/MultiSelectFilter";
import SpendingWordCloudClient from "@/components/dashboard/SpendingWordCloudClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { TransactionList } from "@/components/transactions/TransactionList";
import { FinancialInsights } from "@/components/dashboard/FinancialInsights";
import { generateFinancialInsights, GenerateInsightsOutput, GenerateInsightsInput } from "@/ai/flows/generate-insights-flow";
import { generateCashbackInsights, GenerateCashbackInsightsOutput } from "@/ai/flows/generate-cashback-insights-flow";
import { Timestamp } from "firebase/firestore";
import { ActiveBudgetCard } from "@/components/budgets/ActiveBudgetCard";
import { TopExpensesCard } from "@/components/dashboard/TopExpensesCard";
import { ExpenseHeatmap } from "@/components/dashboard/ExpenseHeatmap";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { gtagEvent } from "@/lib/analytics";
import { TopSpendingDaysChart } from "@/components/dashboard/TopSpendingDaysChart";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Icon } from "@/components/Icon";

// Helper to convert Firestore Timestamps to JSON-compatible strings before sending to the flow
const serializeObjectForFlow = (obj: any): any => {
  if (obj instanceof Timestamp) {
    return obj.toDate().toISOString();
  }
   if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeObjectForFlow);
  }
  if (typeof obj === 'object' && obj !== null) {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if(obj.hasOwnProperty(key)) {
        newObj[key] = serializeObjectForFlow(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

// Cache for AI insights
let cachedInsights: GenerateInsightsOutput | null = null;
let lastFetchTime: number = 0;
let lastDataSignature: string = '';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const NEEDS_WANTS_COLORS = ["hsl(var(--chart-2))", "hsl(var(--chart-4))", "hsl(var(--chart-alt-2))"];
const OTHER_COLOR = "hsl(var(--muted-foreground))";

const getDefaultDateRange = (rangeName?: DefaultDateRange): DateRange => {
  const now = new Date();
  switch (rangeName) {
    case 'last_30_days':
      return { from: startOfDay(sub(now, { days: 29 })), to: endOfDay(now) };
    case 'ytd':
        return { from: startOfYear(now), to: endOfDay(now) };
    case 'this_month':
    default:
      return { from: startOfMonth(now), to: endOfDay(now) };
  }
};

const processPieData = (data: {name: string, value: number}[]) => {
    if (data.length <= 5) {
        return data;
    }
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    const top5 = sortedData.slice(0, 5);
    const otherSum = sortedData.slice(5).reduce((sum, item) => sum + item.value, 0);
    if (otherSum > 0) {
      return [...top5, { name: "Others", value: otherSum }];
    }
    return top5;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isTxFormOpen, setIsTxFormOpen] = useState(false);
  const [insights, setInsights] = useState<GenerateInsightsOutput | null>(cachedInsights);
  const [cashbackInsights, setCashbackInsights] = useState<GenerateCashbackInsightsOutput | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDefaultDateRange('this_month'));

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  const [wordCloudMaxAmount, setWordCloudMaxAmount] = React.useState(200);

  const fetchAndSetData = async () => {
    if (user) {
      setLoading(true);
       const userSettings = await getUserSettings(user.uid);
       setSettings(userSettings);
       setDateRange(getDefaultDateRange(userSettings?.defaultDateRange));
      
      if(userSettings?.featureFlags.recurring) {
        await processRecurringItems(user.uid);
      }

      const [userExpenses, userTransactions, userCategories, userAccounts, userPersons, userBudgets] = await Promise.all([
        getExpenses(user.uid),
        getTransactions(user.uid),
        getCategoriesFromDb(user.uid),
        getAccountsFromDb(user.uid),
        getPersons(user.uid),
        getBudgets(user.uid),
      ]);
      setExpenses(userExpenses);
      setTransactions(userTransactions);
      setCategories(userCategories);
      setAccounts(userAccounts);
      setPersons(userPersons);
      setBudgets(userBudgets);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
        fetchAndSetData();
    }
  }, [user]);

  const ledgerItems = useMemo(() => {
    const combined: LedgerItem[] = [
      ...expenses.map((e) => ({ ...e, itemType: 'expense' as const })),
      ...transactions.map((t) => ({ ...t, itemType: 'transaction' as const })),
    ];
    combined.sort((a, b) => b.date.toMillis() - a.date.toMillis());
    return combined;
  }, [expenses, transactions]);
  
  const filteredLedgerItems = useMemo(() => {
    return ledgerItems.filter(item => {
        // Date filter
        if (dateRange?.from) {
            const from = dateRange.from;
            const to = dateRange.to ? endOfDay(dateRange.to) : new Date();
            const itemDate = item.date.toDate();
            if (itemDate < from || itemDate > to) {
            return false;
            }
        }
        
        if (item.itemType === 'expense') {
            // Category filter for expenses
            if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(item.categoryId)) {
                return false;
            }
            
            // Account filter for expenses
            if (selectedAccountIds.length > 0 && (!item.accountId || !selectedAccountIds.includes(item.accountId))) {
                return false;
            }
        } else { // It's a transaction
             // Account filter for transactions
            if (selectedAccountIds.length > 0) {
                const inFrom = item.fromAccountId && selectedAccountIds.includes(item.fromAccountId);
                const inTo = item.toAccountId && selectedAccountIds.includes(item.toAccountId);
                if(!inFrom && !inTo) return false;
            }
        }

        return true;
    });
  }, [ledgerItems, dateRange, selectedCategoryIds, selectedAccountIds]);
  
  const filteredExpenses = useMemo(() => {
    return filteredLedgerItems.filter(item => item.itemType === 'expense') as (Expense & { itemType: 'expense' })[];
  },[filteredLedgerItems]);

  const filteredTransactions = useMemo(() => {
    return filteredLedgerItems.filter(item => item.itemType === 'transaction') as (Transaction & { itemType: 'transaction' })[];
  }, [filteredLedgerItems]);

  const featureFlags = settings?.featureFlags || { loans: false, budgets: false, transactions: true, aiInsights: false, recurring: false };
  const currency = settings?.currency || 'USD';

  useEffect(() => {
    const fetchInsights = async () => {
        if (loading || !settings?.featureFlags.aiInsights || !dateRange?.from || !dateRange?.to) {
            setInsightsLoading(false);
            return;
        }

        const now = Date.now();
        const dataSignature = JSON.stringify({
          filteredExpenses,
          filteredTransactions,
          budgets,
          persons,
        });

        if (cachedInsights && now - lastFetchTime < CACHE_DURATION && dataSignature === lastDataSignature) {
          setInsights(cachedInsights);
          setInsightsLoading(false);
        } else {
            setInsightsLoading(true);
            try {
                const serializedInput = {
                  expenses: serializeObjectForFlow(filteredExpenses),
                  transactions: serializeObjectForFlow(filteredTransactions),
                  categories: serializeObjectForFlow(categories),
                  accounts: serializeObjectForFlow(accounts),
                  budgets: serializeObjectForFlow(budgets),
                  persons: serializeObjectForFlow(persons),
                  dateRange: serializeObjectForFlow({ from: dateRange.from, to: dateRange.to }),
                  currency,
                };
                const result = await generateFinancialInsights(serializedInput as GenerateInsightsInput);
                setInsights(result);
                cachedInsights = result;
                lastFetchTime = now;
                lastDataSignature = dataSignature;
                gtagEvent({ action: 'generate_insights', category: 'AI', label: 'Dashboard Insights' });
            } catch (error) {
                console.error("Failed to generate insights:", error);
                setInsights(null);
            }
        }

        // Fetch cashback insights separately
        try {
            const cashbackInput = {
                expenses: serializeObjectForFlow(filteredExpenses.map(e => ({id: e.id, name: e.name, amount: e.amount, categoryId: e.categoryId, accountId: e.accountId}))),
                accounts: serializeObjectForFlow(accounts.map(a => ({id: a.id, name: a.name, type: a.type, cashbackPercentage: a.cashbackPercentage}))),
                categories: serializeObjectForFlow(categories.map(c => ({id: c.id, name: c.name}))),
                currency,
            };
            const cashbackResult = await generateCashbackInsights(cashbackInput);
            setCashbackInsights(cashbackResult);
        } catch (error) {
            console.error("Failed to generate cashback insights:", error);
            setCashbackInsights(null);
        }

        setInsightsLoading(false);
    };

    fetchInsights();
  }, [loading, settings, filteredExpenses, filteredTransactions, categories, accounts, budgets, persons, dateRange, currency]);

  const {
    selectedPeriodTotal,
    previousPeriodTotal,
    thisMonthTotal,
    lastMonthTotal,
    yearToDateTotal,
    lastYearToDateTotal,
    lifetimeTotal,
    firstExpenseDate
  } = useMemo(() => {
    const getFilteredTotal = (expenseList: Expense[]) => {
      return expenseList
        .filter(e => {
          const categoryMatch = selectedCategoryIds.length > 0 ? selectedCategoryIds.includes(e.categoryId) : true;
          const accountMatch = selectedAccountIds.length > 0 ? (e.accountId ? selectedAccountIds.includes(e.accountId) : false) : true;
          return categoryMatch && accountMatch;
        })
        .reduce((sum, e) => sum + e.amount, 0);
    };

    const selectedPeriodTotal = getFilteredTotal(filteredExpenses);

    let previousPeriodTotal = 0;
    if (dateRange?.from && dateRange?.to) {
      const diff = differenceInDays(dateRange.to, dateRange.from);
      const prevFrom = sub(dateRange.from, { days: diff + 1 });
      const prevTo = sub(dateRange.to, { days: diff + 1 });
      const prevPeriodExpenses = expenses.filter(e => {
        const expenseDate = e.date.toDate();
        return expenseDate >= prevFrom && expenseDate <= prevTo;
      });
      previousPeriodTotal = getFilteredTotal(prevPeriodExpenses);
    }

    const now = new Date();
    const startOfThisMonth = startOfMonth(now);
    const thisMonthExpenses = expenses.filter(e => e.date.toDate() >= startOfThisMonth);
    const thisMonthTotal = getFilteredTotal(thisMonthExpenses);

    const startOfLastMonth = startOfMonth(subMonths(now, 1));
    const endOfLastMonth = endOfMonth(subMonths(now, 1));
    const lastMonthExpenses = expenses.filter(e => {
      const d = e.date.toDate();
      return d >= startOfLastMonth && d <= endOfLastMonth;
    });
    const lastMonthTotal = getFilteredTotal(lastMonthExpenses);

    const startOfThisYear = startOfYear(now);
    const ytdExpenses = expenses.filter(e => e.date.toDate() >= startOfThisYear);
    const yearToDateTotal = getFilteredTotal(ytdExpenses);
    
    const startOfLastYear = startOfYear(subYears(now, 1));
    const endOfLastYearYtd = subYears(now, 1);
    const lastYearYtdExpenses = expenses.filter(e => {
        const d = e.date.toDate();
        return d >= startOfLastYear && d <= endOfLastYearYtd;
    });
    const lastYearToDateTotal = getFilteredTotal(lastYearYtdExpenses);

    const lifetimeTotal = getFilteredTotal(expenses);

    const firstExpenseDate = expenses.length > 0
        ? expenses.reduce((earliest, current) => 
            current.date.toMillis() < earliest.date.toMillis() ? current : earliest
        ).date.toDate()
        : null;

    return { selectedPeriodTotal, previousPeriodTotal, thisMonthTotal, lastMonthTotal, yearToDateTotal, lastYearToDateTotal, lifetimeTotal, firstExpenseDate };
  }, [expenses, filteredExpenses, dateRange, selectedCategoryIds, selectedAccountIds]);

  const selectedPeriodChange = previousPeriodTotal > 0 ? ((selectedPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100 : selectedPeriodTotal > 0 ? 100 : 0;
  const thisMonthChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : thisMonthTotal > 0 ? 100 : 0;
  const yearToDateChange = lastYearToDateTotal > 0 ? ((yearToDateTotal - lastYearToDateTotal) / lastYearToDateTotal) * 100 : yearToDateTotal > 0 ? 100 : 0;


  const { assets, liabilities, receivables, payables } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    accounts.forEach(account => {
      const balance = account.balance || 0;
      if (account.type === 'Bank Account') {
        assets += balance;
      } else if (account.type === 'Credit Account') {
          liabilities += balance;
      }
    });

    const receivables = persons.filter(d => d.currentBalance > 0).reduce((sum, d) => sum + d.currentBalance, 0);
    const payables = persons.filter(d => d.currentBalance < 0).reduce((sum, d) => sum + Math.abs(d.currentBalance), 0);

    return { assets, liabilities, receivables, payables };
  }, [accounts, persons]);
  
    const monthlyInOutData = useMemo(() => {
        const data: { [key: string]: { moneyIn: number, moneyOut: number, date: Date } } = {};

        filteredLedgerItems.forEach((item) => {
            const itemDate = item.date.toDate();
            const monthStart = startOfMonth(itemDate);
            const monthKey = format(monthStart, "yyyy-MM");
            
            if (!data[monthKey]) {
                data[monthKey] = { moneyIn: 0, moneyOut: 0, date: monthStart };
            }

            if (item.itemType === 'expense') {
                data[monthKey].moneyOut += item.amount;
            } else { // transaction
                if (item.type === 'Deposit') data[monthKey].moneyIn += item.amount;
                if (item.type === 'Withdrawal') data[monthKey].moneyOut += item.amount;
                // Transfers are neutral for overall in/out
            }
        });

        return Object.values(data)
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(item => ({ 
                name: format(item.date, "MMM yyyy"), 
                "Money In": item.moneyIn,
                "Money Out": item.moneyOut,
            }));
    }, [filteredLedgerItems]);


  const wordCloudData = useMemo(() => {
    const wordAmounts: { [key: string]: number } = {};
    const expensesForCloud = filteredExpenses.filter(expense => expense.amount <= wordCloudMaxAmount);

    expensesForCloud.forEach(expense => {
      const words = expense.name.split(/\s+/);
      words.forEach(word => {
        const cleanedWord = word.trim().toLowerCase();
        if (cleanedWord.length > 2) { 
          wordAmounts[cleanedWord] = (wordAmounts[cleanedWord] || 0) + expense.amount;
        }
      });
    });
    return Object.entries(wordAmounts).map(([text, value]) => ({ text, value }));
  }, [filteredExpenses, wordCloudMaxAmount]);

  const needsWantsData = useMemo(() => {
    const data: { [key: string]: number } = { Needs: 0, Wants: 0, Uncategorized: 0 };
    filteredExpenses.forEach(expense => {
      const category = categories.find(c => c.id === expense.categoryId);
      const type = category?.type || 'Uncategorized';
      data[type] = (data[type] || 0) + expense.amount;
    });
    return Object.entries(data)
        .map(([name, value]) => ({ name, value }))
        .filter(d => d.value > 0);
  }, [filteredExpenses, categories]);

  const cashbackData = useMemo(() => {
    const data: { [key: string]: number } = {};
    filteredExpenses.forEach((expense) => {
      if (expense.accountId && expense.cashbackAmount && expense.cashbackAmount > 0) {
        const account = accounts.find((a) => a.id === expense.accountId);
        if (account && account.type === 'Credit Account') {
          if (!data[account.name]) {
            data[account.name] = 0;
          }
          data[account.name] += expense.cashbackAmount;
        }
      }
    });
    const rawData = Object.entries(data)
      .map(([name, total]) => ({ name, value: total }))
      .sort((a,b) => b.value - a.value);
    
    return processPieData(rawData);
  }, [filteredExpenses, accounts]);

  const heatmapData = useMemo(() => {
    const months: string[] = [];
    const monthSet = new Set<string>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthKey = format(monthStart, 'MMM yyyy');
        months.push(monthKey);
        monthSet.add(monthKey);
    }
    
    const categoriesForHeatmap = categories.filter(c => c.showInHeatmap ?? true);

    const categorySpending: { [catName: string]: { [month: string]: number } } = {};
    
    categoriesForHeatmap.forEach(cat => {
        categorySpending[cat.name] = {};
    });

    expenses.forEach(expense => {
        const category = categories.find(c => c.id === expense.categoryId);
        const monthKey = format(startOfMonth(expense.date.toDate()), 'MMM yyyy');

        if(category && (category.showInHeatmap ?? true) && monthSet.has(monthKey)) {
            if (!categorySpending[category.name]) {
                categorySpending[category.name] = {};
            }
            categorySpending[category.name][monthKey] = (categorySpending[category.name][monthKey] || 0) + expense.amount;
        }
    });

    return {
        months,
        data: Object.entries(categorySpending).map(([categoryName, monthData]) => ({
            category: categoryName,
            spending: months.map(month => monthData[month] || 0)
        }))
    };
  }, [expenses, categories]);

  const categorySpendingData = useMemo(() => {
    const data: { [key: string]: { name: string, icon?: string, total: number } } = {};
    
    filteredExpenses.forEach((expense) => {
        const category = categories.find((c) => c.id === expense.categoryId);
        const categoryName = category?.name || "Uncategorized";
        const categoryIcon = category?.icon;

        if (!data[categoryName]) {
            data[categoryName] = { name: categoryName, icon: categoryIcon, total: 0 };
        }
        data[categoryName].total += expense.amount;
    });

    return Object.values(data).sort((a, b) => b.total - a.total);
  }, [filteredExpenses, categories]);

  const onFormSubmit = () => {
    fetchAndSetData();
    setIsExpenseFormOpen(false);
    setIsTxFormOpen(false);
  }

  const categoryOptions = useMemo(() => categories.map(c => ({ value: c.id, label: c.name, icon: c.icon })), [categories]);
  const accountOptions = useMemo(() => accounts.map(a => ({ value: a.id, label: a.name, icon: a.icon })), [accounts]);
  
  const currencyFormatter = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(value);
  const tooltipFormatter = (value: number) => [<span className="font-mono">{currencyFormatter(value)}</span>, null];

  return (
    <AppShell>
      <SpeedInsights />
      <header className="flex flex-col items-start gap-4">
          <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h1>
                  <p className="text-muted-foreground">
                  Your financial overview.
                  </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                  {featureFlags.transactions && (
                    <Button onClick={() => setIsTxFormOpen(true)}>
                        <Banknote className="mr-2 h-4 w-4" />
                        Add Transaction
                    </Button>
                  )}
                  <Button onClick={() => setIsExpenseFormOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Expense
                  </Button>
              </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2">
              <DateRangePicker
                  range={dateRange}
                  onRangeChange={setDateRange}
                  align="start"
              />
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
      </header>

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="accounts" disabled={!featureFlags.transactions}>Accounts</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses" className="space-y-4">
            {featureFlags.aiInsights && (
              <div className="grid md:grid-cols-2 gap-4">
                  <FinancialInsights 
                      title="Expense Insights"
                      insights={insights?.expenseInsights}
                      isLoading={insightsLoading}
                  />
                  <FinancialInsights 
                      title="Cashback Insights"
                      insights={cashbackInsights?.insight}
                      isLoading={insightsLoading}
                  />
              </div>
            )}
           <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {loading ? (
                    <>
                        <Skeleton className="h-28" />
                        <Skeleton className="h-28" />
                        <Skeleton className="h-28" />
                        <Skeleton className="h-28" />
                    </>
                ) : (
                    <>
                        <StatCard title="Selected Period" value={selectedPeriodTotal} percentageChange={selectedPeriodChange} period="vs previous period" />
                        <StatCard title="This Month" value={thisMonthTotal} percentageChange={thisMonthChange} period="vs last month" />
                        <StatCard title="Year-to-Date" value={yearToDateTotal} percentageChange={yearToDateChange} period="vs last year" />
                        <StatCard title="Lifetime" value={lifetimeTotal} sinceDate={firstExpenseDate ? format(firstExpenseDate, 'PPP') : undefined} />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <>
                        <Skeleton className="h-80" />
                        <Skeleton className="h-80" />
                    </>
                ) : (
                    <>
                      <ExpenseCharts expenses={filteredExpenses} categories={categories} accounts={accounts} />
                      
                    </>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-1">
                 {loading ? <Skeleton className="h-80" /> : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Expense Consistency</CardTitle>
                            <CardDescription>Heatmap of spending in top categories over the last 6 months.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <ExpenseHeatmap data={heatmapData.data} months={heatmapData.months} />
                        </CardContent>
                    </Card>
                 )}
            </div>
            
            <div className="grid gap-4 md:grid-cols-1">
                 {loading ? (
                    <Skeleton className="h-80" />
                ) : (
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle className="font-headline">Spending Hotspots</CardTitle>
                                <CardDescription>A word cloud of your most frequent expense names.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                               <Label htmlFor="word-cloud-max" className="text-sm">Max Amount</Label>
                               <CurrencyInput 
                                 id="word-cloud-max"
                                 value={wordCloudMaxAmount}
                                 onChange={setWordCloudMaxAmount}
                                 className="w-32"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="w-full h-80">
                                <SpendingWordCloudClient data={wordCloudData} />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                 {loading ? (
                    <>
                        <Skeleton className="h-80" />
                        <Skeleton className="h-80" />
                    </>
                ) : (
                    <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Needs vs. Wants</CardTitle>
                            <CardDescription>How your spending is divided between necessities and discretionary items.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {needsWantsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "hsl(var(--background))",
                                                border: "1px solid hsl(var(--border))",
                                                fontFamily: "var(--font-mono)",
                                            }}
                                            formatter={tooltipFormatter}
                                        />
                                        <Legend />
                                        <Pie
                                            data={needsWantsData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            labelLine={true}
                                            label={(entry) => `${((entry.value / needsWantsData.reduce((acc, curr) => acc + curr.value, 0)) * 100).toFixed(0)}%`}
                                        >
                                        {needsWantsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.name === 'Others' ? OTHER_COLOR : NEEDS_WANTS_COLORS[index % NEEDS_WANTS_COLORS.length]} />
                                        ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                    Not enough data to display chart.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Cashback Earned</CardTitle>
                            <CardDescription>Total cashback earned per credit account.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           {cashbackData.length > 0 ? (
                             <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--background))",
                                            border: "1px solid hsl(var(--border))",
                                            fontFamily: "var(--font-mono)",
                                        }}
                                        formatter={tooltipFormatter}
                                    />
                                    <Legend />
                                    <Pie
                                        data={cashbackData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        labelLine={true}
                                        label={(entry) => `${((entry.value / cashbackData.reduce((acc, curr) => acc + curr.value, 0)) * 100).toFixed(0)}%`}
                                    >
                                    {cashbackData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Others' ? OTHER_COLOR : NEEDS_WANTS_COLORS[index % NEEDS_WANTS_COLORS.length]} />
                                    ))}
                                    </Pie>
                                </PieChart>
                             </ResponsiveContainer>
                           ) : (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                    No cashback data to display.
                                </div>
                           )}
                        </CardContent>
                    </Card>
                    </>
                )}
            </div>
            {loading ? <Skeleton className="h-80" /> : (
                <TopExpensesCard expenses={filteredExpenses} />
            )}
            {loading ? <Skeleton className="h-96" /> : (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Spending by Category</CardTitle>
                        <CardDescription>A summary of total spending for each category in the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categorySpendingData.map((item) => (
                                    <TableRow key={item.name}>
                                        <TableCell>
                                            <div className="flex items-center gap-2 font-medium">
                                                <Icon name={item.icon || 'Package'} className="h-4 w-4 text-muted-foreground" />
                                                <span>{item.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{currencyFormatter(item.total)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         {categorySpendingData.length === 0 && (
                            <div className="text-center p-8 text-muted-foreground">
                                No expenses to display for this period.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </TabsContent>
        <TabsContent value="accounts" className="space-y-4">
            {featureFlags.aiInsights && (
              <FinancialInsights
                  title="Account Insights"
                  insights={insights?.accountInsights}
                  isLoading={insightsLoading}
              />
            )}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="md:col-span-1 space-y-4">
                     {loading ? <Skeleton className="h-full" /> : (
                         <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Account Balances</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                <div className="flex justify-between items-center border p-3 rounded-md">
                                        <div>
                                            <p className="text-sm font-medium">Assets</p>
                                            <p className="text-xs text-muted-foreground">Bank Accounts</p>
                                        </div>
                                        <p className="text-lg font-bold text-green-600 font-mono">{new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(assets)}</p>
                                </div>
                                <div className="flex justify-between items-center border p-3 rounded-md">
                                        <div>
                                            <p className="text-sm font-medium">Liabilities</p>
                                            <p className="text-xs text-muted-foreground">Credit Accounts</p>
                                        </div>
                                        <p className="text-lg font-bold text-red-600 font-mono">{new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(liabilities)}</p>
                                </div>
                                {featureFlags.loans && (
                                <>
                                    <div className="flex justify-between items-center border p-3 rounded-md">
                                            <div>
                                                <p className="text-sm font-medium">Receivables</p>
                                                <p className="text-xs text-muted-foreground">Money Lent</p>
                                            </div>
                                            <p className="text-lg font-bold text-green-600 font-mono">{new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(receivables)}</p>
                                    </div>
                                    <div className="flex justify-between items-center border p-3 rounded-md">
                                            <div>
                                                <p className="text-sm font-medium">Payables</p>
                                                <p className="text-xs text-muted-foreground">Money Borrowed</p>
                                            </div>
                                            <p className="text-lg font-bold text-red-600 font-mono">{new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(payables)}</p>
                                    </div>
                                </>
                                )}
                                </CardContent>
                            </Card>
                            {featureFlags.budgets && <ActiveBudgetCard />}
                         </>
                     )}
                 </div>
                 <div className="md:col-span-2">
                     {loading ? <Skeleton className="h-80" /> : (
                          <Card>
                             <CardHeader>
                                 <CardTitle className="font-headline">Monthly Cash Flow</CardTitle>
                                 <CardDescription>A comparison of money in vs. money out for the selected period.</CardDescription>
                             </CardHeader>
                             <CardContent>
                                 <ResponsiveContainer width="100%" height={300}>
                                     <BarChart data={monthlyInOutData}>
                                         <CartesianGrid strokeDasharray="3 3" />
                                         <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                         <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => currencyFormatter(value)} />
                                         <Tooltip
                                             contentStyle={{
                                                 backgroundColor: "hsl(var(--background))",
                                                 border: "1px solid hsl(var(--border))",
                                                 fontFamily: "var(--font-mono)",
                                             }}
                                             formatter={tooltipFormatter}
                                             cursor={{fill: 'hsl(var(--muted))'}}
                                         />
                                         <Legend />
                                         <Bar dataKey="Money In" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                                         <Bar dataKey="Money Out" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                                     </BarChart>
                                 </ResponsiveContainer>
                             </CardContent>
                          </Card>
                     )}
                 </div>
             </div>
             <div className="grid gap-4">
                 {loading ? (
                     <Skeleton className="h-96" />
                 ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Transaction History</CardTitle>
                            <CardDescription>A detailed log of all your transactions and expenses.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <TransactionList 
                                items={filteredLedgerItems}
                                categories={categories}
                                accounts={accounts}
                                onDataChanged={fetchAndSetData}
                            />
                        </CardContent>
                    </Card>
                 )}
             </div>
        </TabsContent>
      </Tabs>

      <ExpenseForm
        isOpen={isExpenseFormOpen}
        onOpenChange={setIsExpenseFormOpen}
        categories={categories}
        accounts={accounts}
        onFormSubmit={onFormSubmit}
      />
      <TransactionForm 
        isOpen={isTxFormOpen}
        onOpenChange={setIsTxFormOpen}
        accounts={accounts}
        onFormSubmit={onFormSubmit}
      />
    </AppShell>
  );
}

