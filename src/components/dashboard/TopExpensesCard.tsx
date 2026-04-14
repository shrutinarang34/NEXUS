

"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Expense, UserSettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { getUserSettings } from '@/lib/firestore';

type SortOrder = 'largest' | 'smallest' | 'recent' | 'oldest';

interface TopExpensesCardProps {
    expenses: Expense[];
}

export function TopExpensesCard({ expenses }: TopExpensesCardProps) {
    const { user } = useAuth();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [sortOrder, setSortOrder] = useState<SortOrder>('largest');

    useEffect(() => {
      if(user) {
          getUserSettings(user.uid).then(setSettings);
      }
    }, [user]);

    const topExpenses = useMemo(() => {
        const sorted = [...expenses];

        switch(sortOrder) {
            case 'largest':
                sorted.sort((a, b) => b.amount - a.amount);
                break;
            case 'smallest':
                sorted.sort((a, b) => a.amount - b.amount);
                break;
            case 'recent':
                sorted.sort((a, b) => b.date.toMillis() - a.date.toMillis());
                break;
            case 'oldest':
                sorted.sort((a, b) => a.date.toMillis() - b.date.toMillis());
                break;
        }

        return sorted.slice(0, 5);
    }, [expenses, sortOrder]);

    const sortOrderLabels: Record<SortOrder, string> = {
        largest: 'Largest Amount',
        smallest: 'Smallest Amount',
        recent: 'Most Recent',
        oldest: 'Oldest'
    }

    if (expenses.length === 0) {
        return null;
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: settings?.currency || 'USD' 
        }).format(val);
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline">Top Expenses</CardTitle>
                    <CardDescription>Your most significant expenses in the selected period.</CardDescription>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-auto gap-1">
                            <Filter className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                {sortOrderLabels[sortOrder]}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSortOrder('largest')}>Largest Amount</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortOrder('smallest')}>Smallest Amount</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortOrder('recent')}>Most Recent</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortOrder('oldest')}>Oldest</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Expense</TableHead>
                            <TableHead className="text-right">Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {topExpenses.map((expense) => (
                            <TableRow key={expense.id}>
                                <TableCell className="font-medium">{expense.name}</TableCell>
                                <TableCell className="text-right text-muted-foreground text-sm">{format(expense.date.toDate(), 'MMM d, yyyy')}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(expense.amount)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 {topExpenses.length === 0 && (
                    <div className="text-center p-8 text-muted-foreground">
                        No expenses to display for this period.
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
