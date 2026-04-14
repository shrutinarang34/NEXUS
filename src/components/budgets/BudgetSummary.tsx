
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, AlertTriangle, CalendarDays } from "lucide-react";
import type { Budget, UserSettings } from "@/types";
import { differenceInDays, format, isBefore, differenceInCalendarDays, startOfDay } from 'date-fns';
import { useAuth } from "@/lib/auth";
import * as React from "react";
import { getUserSettings } from "@/lib/firestore";

interface BudgetSummaryProps {
  budget: Budget;
  totalSpent: number;
}

export function BudgetSummary({ budget, totalSpent }: BudgetSummaryProps) {
  const { user } = useAuth();
  const [settings, setSettings] = React.useState<UserSettings | null>(null);

  React.useEffect(() => {
    if(user) {
        getUserSettings(user.uid).then(setSettings);
    }
  }, [user]);

  const remainingAmount = budget.amount - totalSpent;
  const isOverBudget = remainingAmount < 0;

  const today = startOfDay(new Date());
  const endDate = startOfDay(budget.endDate.toDate());
  const remainingDays = differenceInCalendarDays(endDate, today);
  const isCompleted = isBefore(endDate, today);

  const dailyAverage = totalSpent > 0 ? totalSpent / (differenceInDays(today, budget.startDate.toDate()) + 1) : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: settings?.currency || 'USD' 
    }).format(val);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Amount Remaining</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(remainingAmount)}
          </div>
          <p className="text-xs text-muted-foreground">
            {isOverBudget ? 'Over budget' : 'Left to spend'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Days Remaining</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isCompleted ? 'Completed' : (remainingDays >= 0 ? `${remainingDays} day(s)` : 'Ended')}
          </div>
          <p className="text-xs text-muted-foreground">
            Budget ends on {format(budget.endDate.toDate(), "MMM dd, yyyy")}
          </p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Daily Average Spend</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(dailyAverage)}
          </div>
          <p className="text-xs text-muted-foreground">
            Average spent per day so far
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
