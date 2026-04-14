
"use client";

import { useMemo, useState, useEffect } from 'react';
import type { Expense, UserSettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { getUserSettings } from '@/lib/firestore';

interface TopSpendingDaysChartProps {
    expenses: Expense[];
}

export function TopSpendingDaysChart({ expenses }: TopSpendingDaysChartProps) {
    const { user } = useAuth();
    const [settings, setSettings] = useState<UserSettings | null>(null);

    useEffect(() => {
        if(user) {
            getUserSettings(user.uid).then(setSettings);
        }
    }, [user]);

    const dailyData = useMemo(() => {
        const data: { [key: string]: number } = {};
        expenses.forEach((expense) => {
            const day = format(expense.date.toDate(), 'yyyy-MM-dd');
            if (!data[day]) {
                data[day] = 0;
            }
            data[day] += expense.amount;
        });

        return Object.entries(data)
            .map(([date, total]) => ({
                date,
                name: format(new Date(date), "MMM d"),
                total,
            }))
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [expenses]);
    
    const currencyFormatter = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: settings?.currency || 'USD' }).format(value);
    const tooltipFormatter = (value: number) => [<span className="font-mono">{currencyFormatter(value)}</span>, "Total Spent"];

    if (expenses.length === 0) {
        return null; // Don't render the card if there's no data
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Daily Spending</CardTitle>
                <CardDescription>Your total spending for each day in the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyData}>
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
                            cursor={{ fill: 'hsl(var(--muted))' }}
                        />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
