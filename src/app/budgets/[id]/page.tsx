
"use client";

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth';
import { getBudget, getExpenses, getCategories, deleteBudget, getUserSettings } from '@/lib/firestore';
import type { Budget, Expense, Category, UserSettings } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { notFound, useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Target, Trash2 } from 'lucide-react';
import { differenceInDays, format, isBefore } from 'date-fns';
import BudgetCharts from '@/components/budgets/BudgetCharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BudgetSummary } from '@/components/budgets/BudgetSummary';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { gtagEvent } from '@/lib/analytics';
import { CategoryPerformance } from '@/components/budgets/CategoryPerformance';

export default function BudgetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setLoading(true);
        const [budgetData, userSettings] = await Promise.all([
            getBudget(user.uid, id),
            getUserSettings(user.uid),
        ]);
        
        if (!budgetData) {
          notFound();
        }
        
        setBudget(budgetData);
        setSettings(userSettings);

        const [userExpenses, userCategories] = await Promise.all([
          getExpenses(user.uid),
          getCategories(user.uid)
        ]);

        const filteredExpenses = userExpenses.filter(expense => {
          const expenseDate = expense.date.toDate();
          return expenseDate >= budgetData.startDate.toDate() && expenseDate <= budgetData.endDate.toDate();
        });
        
        setExpenses(filteredExpenses);
        setCategories(userCategories);
        setLoading(false);
      };
      fetchData();
    }
  }, [user, id]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: settings?.currency || 'USD' 
    }).format(val);
  }

  const budgetAnalysis = useMemo(() => {
    if (!budget || categories.length === 0) {
      return {
        totalSpent: 0,
        progress: 0,
        remainingAmount: budget?.amount || 0,
        categorySpending: [],
        unallocatedSpending: 0,
      };
    }
    
    let totalSpent = 0;
    const categorySpendingMap = new Map<string, number>();
    budget.allocations.forEach(alloc => categorySpendingMap.set(alloc.categoryId, 0));

    let unallocatedSpending = 0;

    expenses.forEach(expense => {
      totalSpent += expense.amount;
      if (categorySpendingMap.has(expense.categoryId)) {
        categorySpendingMap.set(expense.categoryId, categorySpendingMap.get(expense.categoryId)! + expense.amount);
      } else {
        unallocatedSpending += expense.amount;
      }
    });

    const categorySpending = Array.from(categorySpendingMap.entries()).map(([categoryId, spent]) => {
      const allocation = budget.allocations.find(a => a.categoryId === categoryId);
      const category = categories.find(c => c.id === categoryId);
      return {
        categoryId,
        name: category?.name || "Unknown",
        icon: category?.icon,
        spent,
        budgeted: allocation?.amount || 0,
      }
    });

    return {
      totalSpent,
      progress: budget.amount > 0 ? (totalSpent / budget.amount) * 100 : 0,
      remainingAmount: budget.amount - totalSpent,
      categorySpending,
      unallocatedSpending
    };
  }, [budget, expenses, categories]);

  const handleDeleteBudget = async () => {
    if (!user || !budget) return;
    try {
      await deleteBudget(user.uid, budget.id);
      toast({
        title: "Success",
        description: "Budget has been deleted.",
      });
      gtagEvent({ action: 'delete_budget', category: 'Budget', label: budget.name, value: budget.amount });
      router.push("/budgets");
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete budget.",
      });
      gtagEvent({ action: 'budget_error', category: 'Error', label: 'Delete Budget Failed' });
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-8 w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppShell>
    );
  }

  if (!budget) {
    return notFound();
  }

  const isCompleted = isBefore(budget.endDate.toDate(), new Date());

  const progressColor = budgetAnalysis.progress > 100 ? "bg-red-600" : budgetAnalysis.progress > 80 ? "bg-yellow-500" : "bg-primary";

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <header>
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">{budget.name}</h1>
                    <p className="text-muted-foreground">
                        {format(budget.startDate.toDate(), "LLL dd, yyyy")} - {format(budget.endDate.toDate(), "LLL dd, yyyy")}
                    </p>
                </div>
                 <div className="flex gap-2">
                    <Link href="/budgets">
                        <Button variant="outline">Back to Budgets</Button>
                    </Link>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your
                                budget.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteBudget}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </div>
            </div>
        </header>

        {budgetAnalysis.progress > 100 && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Budget Exceeded</AlertTitle>
                <AlertDescription>
                    You have spent more than your allocated budget.
                </AlertDescription>
            </Alert>
        )}
        {budgetAnalysis.progress > 80 && budgetAnalysis.progress <= 100 && (
            <Alert className="border-yellow-500 text-yellow-600 dark:border-yellow-600 dark:text-yellow-500 [&>svg]:text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Approaching Limit</AlertTitle>
                <AlertDescription>
                    You have used over 80% of your budget.
                </AlertDescription>
            </Alert>
        )}
        
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Progress value={budgetAnalysis.progress} indicatorClassName={progressColor} />
                    <div className="flex justify-between text-sm font-mono">
                        <span>{formatCurrency(budgetAnalysis.totalSpent)}</span>
                        <span>{formatCurrency(budget.amount)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        <BudgetSummary budget={budget} totalSpent={budgetAnalysis.totalSpent} />

        <CategoryPerformance categorySpending={budgetAnalysis.categorySpending} />

        <BudgetCharts 
            budget={budget} 
            expenses={expenses} 
            categorySpending={budgetAnalysis.categorySpending}
            unallocatedSpending={budgetAnalysis.unallocatedSpending}
        />

      </div>
    </AppShell>
  );
}
