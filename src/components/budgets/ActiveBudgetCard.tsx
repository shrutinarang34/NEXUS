
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/auth';
import { getBudgets, getExpenses } from '@/lib/firestore';
import type { Budget, Expense } from '@/types';
import { Button } from '../ui/button';
import { Target } from 'lucide-react';
import { gtagEvent } from '@/lib/analytics';

export function ActiveBudgetCard() {
  const { user } = useAuth();
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setLoading(true);
        const allBudgets = await getBudgets(user.uid);
        const now = new Date();
        const currentBudget = allBudgets.find(b => b.startDate.toDate() <= now && b.endDate.toDate() >= now) || null;
        setActiveBudget(currentBudget);

        if (currentBudget) {
          const allExpenses = await getExpenses(user.uid);
          const budgetExpenses = allExpenses.filter(e => 
            e.date.toDate() >= currentBudget.startDate.toDate() && 
            e.date.toDate() <= currentBudget.endDate.toDate()
          );
          setExpenses(budgetExpenses);
        }
        setLoading(false);
      };
      fetchData();
    }
  }, [user]);

  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  if (loading) {
    return <Skeleton className="h-48" />;
  }

  if (!activeBudget) {
    return null; // Don't render anything if there's no active budget
  }

  const progress = (totalSpent / activeBudget.amount) * 100;
  const remaining = activeBudget.amount - totalSpent;
  const progressColor = progress > 100 ? "bg-red-600" : progress > 80 ? "bg-yellow-500" : "bg-primary";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="font-headline">Active Budget</CardTitle>
        </div>
        <CardDescription>{activeBudget.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between mb-1 text-sm">
            <span className="font-medium">Spent: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalSpent)}</span>
            <span className="text-muted-foreground">Budget: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(activeBudget.amount)}</span>
          </div>
          <Progress value={progress} indicatorClassName={progressColor} />
          <p className={`mt-1 text-sm font-medium ${remaining < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
            {remaining >= 0 ? `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(remaining)} remaining` : `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(remaining))} over budget`}
          </p>
        </div>
        <Link href={`/budgets/${activeBudget.id}`}>
          <Button variant="secondary" className="w-full" onClick={() => gtagEvent({ action: 'view_budget_details', category: 'Budget', label: activeBudget.name })}>View Details</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
