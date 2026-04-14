

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Expense, Category, Account, UserSettings } from "@/types";
import { format, startOfMonth } from "date-fns";
import { useAuth } from "@/lib/auth";
import { getUserSettings } from "@/lib/firestore";

interface ExpenseChartsProps {
  expenses: Expense[];
  categories: Category[];
  accounts: Account[];
}

const CATEGORY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const ACCOUNT_COLORS = [
  "hsl(var(--chart-alt-1))",
  "hsl(var(--chart-alt-2))",
  "hsl(var(--chart-alt-3))",
  "hsl(var(--chart-alt-4))",
  "hsl(var(--chart-alt-5))",
];

const OTHER_COLOR = "hsl(var(--muted-foreground))";

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

export function ExpenseCharts({ expenses, categories, accounts }: ExpenseChartsProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    if(user) {
        getUserSettings(user.uid).then(setSettings);
    }
  }, [user]);

  const monthlyData = useMemo(() => {
    const data: { [key: string]: { total: number, date: Date } } = {};

    expenses.forEach((expense) => {
      const expenseDate = expense.date.toDate();
      const monthStart = startOfMonth(expenseDate);
      const monthKey = format(monthStart, "yyyy-MM");
      
      if (!data[monthKey]) {
        data[monthKey] = { total: 0, date: monthStart };
      }
      data[monthKey].total += expense.amount;
    });

    return Object.values(data)
      .filter(item => item.total > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(item => ({ 
        name: format(item.date, "MMM yyyy"), 
        total: item.total 
      }));

  }, [expenses]);

  const categoryData = useMemo(() => {
    const data: { [key: string]: number } = {};
    expenses.forEach((expense) => {
      const categoryName =
        categories.find((c) => c.id === expense.categoryId)?.name || "Uncategorized";
      if (!data[categoryName]) {
        data[categoryName] = 0;
      }
      data[categoryName] += expense.amount;
    });

    const rawData = Object.entries(data).map(([name, value]) => ({ name, value }));
    return processPieData(rawData);
  }, [expenses, categories]);

  const accountData = useMemo(() => {
    const data: { [key: string]: { total: number } } = {};
    expenses.forEach((expense) => {
      if(expense.accountId) {
        const accountName =
          accounts.find((a) => a.id === expense.accountId)?.name || "Uncategorized";
        if (!data[accountName]) {
          data[accountName] = { total: 0 };
        }
        data[accountName].total += expense.amount;
      }
    });

    const rawData = Object.entries(data).map(([name, value]) => ({ name, value: value.total }));
    return processPieData(rawData);
  }, [expenses, accounts]);


  const currencyFormatter = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: settings?.currency || 'USD' }).format(value);
  const tooltipFormatter = (value: number) => [<span className="font-mono">{currencyFormatter(value)}</span>, null];


  if(expenses.length === 0) {
    return (
        <Card className="col-span-1 lg:col-span-3 flex items-center justify-center h-80">
            <p className="text-muted-foreground">No expense data for the selected period to display charts.</p>
        </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Monthly Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => currencyFormatter(value).slice(0, -3) } />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    fontFamily: "var(--font-mono)",
                  }}
                  formatter={tooltipFormatter}
                  cursor={{fill: 'hsl(var(--muted))'}}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
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
                <Legend
                    wrapperStyle={{
                        fontSize: "12px",
                        lineHeight: "20px"
                    }}
                />
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={(entry) => `${((entry.value / categoryData.reduce((acc, curr) => acc + curr.value, 0)) * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Others' ? OTHER_COLOR : CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Account Spending</CardTitle>
          </CardHeader>
          <CardContent>
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
                <Legend
                    wrapperStyle={{
                        fontSize: "12px",
                        lineHeight: "20px"
                    }}
                />
                <Pie
                  data={accountData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={(entry) => `${((entry.value / accountData.reduce((acc, curr) => acc + curr.value, 0)) * 100).toFixed(0)}%`}
                >
                  {accountData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Others' ? OTHER_COLOR : ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    
