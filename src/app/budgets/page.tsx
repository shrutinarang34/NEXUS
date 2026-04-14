
"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { getBudgets, getCategories, getUserSettings } from "@/lib/firestore";
import type { Budget, Category, UserSettings } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlusCircle, History, CalendarClock } from "lucide-react";
import { BudgetForm } from "@/components/budgets/BudgetForm";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export default function BudgetsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (user) {
      getUserSettings(user.uid).then(userSettings => {
        if (!userSettings?.featureFlags.budgets) {
          router.push('/');
        } else {
          setSettings(userSettings);
          fetchData();
        }
      });
    }
  }, [user, router]);

  const fetchData = async () => {
    if (user) {
      setLoading(true);
      try {
        const [userBudgets, userCategories, userSettings] = await Promise.all([
          getBudgets(user.uid),
          getCategories(user.uid),
          getUserSettings(user.uid),
        ]);
        setBudgets(userBudgets);
        setCategories(userCategories);
        setSettings(userSettings);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
  };
  
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: settings?.currency || 'USD' 
    }).format(val);
  }

  const onFormSubmit = () => {
    fetchData();
    setIsFormOpen(false);
  }

  const now = new Date();
  const activeBudget = budgets.find(b => b.startDate.toDate() <= now && b.endDate.toDate() >= now);
  const upcomingBudgets = budgets.filter(b => b.startDate.toDate() > now);
  const historicalBudgets = budgets.filter(b => b.endDate.toDate() < now);

  if (!settings) {
    return <AppShell><Skeleton className="h-96 w-full" /></AppShell>;
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Budgets</h1>
            <p className="text-muted-foreground">Create and manage your financial budgets.</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Budget
          </Button>
        </header>

        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : activeBudget ? (
            <Card className="bg-primary/5 dark:bg-primary/10 border-primary/20">
              <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="font-headline">{activeBudget.name}</CardTitle>
                    <Badge>Active</Badge>
                  </div>
                  <CardDescription>
                      {format(activeBudget.startDate.toDate(), "MMM d, yyyy")} - {format(activeBudget.endDate.toDate(), "MMM d, yyyy")}
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span>Total Budget</span>
                            <span>{formatCurrency(activeBudget.amount)}</span>
                        </div>
                        <Link href={`/budgets/${activeBudget.id}`} className="block">
                            <Button className="w-full mt-2">View Details</Button>
                        </Link>
                  </div>
              </CardContent>
            </Card>
        ) : (
          !loading && upcomingBudgets.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center border-2 border-dashed rounded-lg">
              <h3 className="text-lg font-semibold">No Active Budget</h3>
              <p className="text-sm text-muted-foreground">Create a new budget to get started.</p>
              <Button size="sm" className="mt-4" onClick={() => setIsFormOpen(true)}>Create Budget</Button>
            </div>
          )
        )}
        
        {upcomingBudgets.length > 0 && (
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline">
                    <CalendarClock className="h-5 w-5" />
                    Upcoming Budgets
                </CardTitle>
                </CardHeader>
                <CardContent>
                <div className="space-y-4">
                    {upcomingBudgets.map(budget => (
                    <Link key={budget.id} href={`/budgets/${budget.id}`} className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-center">
                        <p className="font-semibold">{budget.name}</p>
                        <Badge variant="secondary">Upcoming</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{format(budget.startDate.toDate(), "MMM d, yyyy")} - {format(budget.endDate.toDate(), "MMM d, yyyy")}</p>
                        <p className="text-sm font-medium mt-1">{formatCurrency(budget.amount)}</p>
                    </Link>
                    ))}
                </div>
                </CardContent>
            </Card>
        )}

        {historicalBudgets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                <History className="h-5 w-5" />
                Budget History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {historicalBudgets.map(budget => (
                  <Link key={budget.id} href={`/budgets/${budget.id}`} className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">{budget.name}</p>
                      <Badge variant="outline">Completed</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{format(budget.startDate.toDate(), "MMM d, yyyy")} - {format(budget.endDate.toDate(), "MMM d, yyyy")}</p>
                    <p className="text-sm font-medium mt-1">{formatCurrency(budget.amount)}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BudgetForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        categories={categories}
        onFormSubmit={onFormSubmit}
      />
    </AppShell>
  );
}
