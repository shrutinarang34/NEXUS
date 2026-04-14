

"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Budget, Expense, UserSettings } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { differenceInDays, format, addDays } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { getUserSettings } from '@/lib/firestore';

interface BudgetChartsProps {
  budget: Budget;
  expenses: Expense[];
  categorySpending: { categoryId: string, name: string, spent: number, budgeted: number }[];
  unallocatedSpending: number;
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
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


export default function BudgetCharts({ budget, expenses, categorySpending, unallocatedSpending }: BudgetChartsProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    if(user) {
        getUserSettings(user.uid).then(setSettings);
    }
  }, [user]);

  const barChartData = useMemo(() => {
    return categorySpending.map(c => ({
      name: c.name,
      Budgeted: c.budgeted,
      Spent: c.spent,
    }));
  }, [categorySpending]);

  const pieChartData = useMemo(() => {
    const data = categorySpending.map(c => ({ name: c.name, value: c.spent }));
    if(unallocatedSpending > 0){
        data.push({ name: 'Unallocated', value: unallocatedSpending });
    }
    const filteredData = data.filter(d => d.value > 0);
    return processPieData(filteredData);
  }, [categorySpending, unallocatedSpending]);

  const trendData = useMemo(() => {
    const startDate = budget.startDate.toDate();
    const endDate = budget.endDate.toDate();
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const idealDailySpend = budget.amount / totalDays;

    const cumulativeSpending = new Array(totalDays).fill(0);
    expenses.forEach(expense => {
      const dayIndex = differenceInDays(expense.date.toDate(), startDate);
      if (dayIndex >= 0 && dayIndex < totalDays) {
        for (let i = dayIndex; i < totalDays; i++) {
          cumulativeSpending[i] += expense.amount;
        }
      }
    });

    return Array.from({ length: totalDays }, (_, i) => {
      const date = addDays(startDate, i);
      return {
        date: format(date, 'MMM d'),
        'Actual Spending': cumulativeSpending[i],
        'Ideal Burn Rate': idealDailySpend * (i + 1),
      };
    });
  }, [budget, expenses]);

  const currencyFormatter = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: settings?.currency || 'USD' }).format(value);
  const tooltipFormatter = (value: number) => [<span className="font-mono">{currencyFormatter(value)}</span>, null];

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No spending data yet for this budget period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Budget vs. Actual</CardTitle>
          <CardDescription>Comparison of budgeted and spent amounts per category.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => currencyFormatter(value).replace(/(\.00$|,00$)/, '')} />
              <YAxis type="category" dataKey="name" width={80} />
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
              <Bar dataKey="Budgeted" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Spent" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Spending by Category</CardTitle>
          <CardDescription>How your spending is distributed across categories.</CardDescription>
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
              <Pie
                data={pieChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                labelLine={true}
                label={(entry) => `${((entry.value / pieChartData.reduce((acc, curr) => acc + curr.value, 0)) * 100).toFixed(0)}%`}
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'Others' ? OTHER_COLOR : COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-headline">Spending Trend</CardTitle>
          <CardDescription>Your cumulative spending versus an ideal burn rate.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => currencyFormatter(value).replace(/(\.00$|,00$)/, '')}/>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  fontFamily: "var(--font-mono)",
                }}
                formatter={tooltipFormatter}
              />
              <Legend />
              <Line type="monotone" dataKey="Actual Spending" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Ideal Burn Rate" stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
