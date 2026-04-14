

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useAuth } from "@/lib/auth";
import { getUserSettings } from "@/lib/firestore";
import type { UserSettings } from "@/types";

interface StatCardProps {
  title: string;
  value: number;
  percentageChange?: number;
  period?: string;
  sinceDate?: string;
}

export function StatCard({ title, value, percentageChange, period, sinceDate }: StatCardProps) {
  const { user } = useAuth();
  const [settings, setSettings] = React.useState<UserSettings | null>(null);

  React.useEffect(() => {
    if(user) {
        getUserSettings(user.uid).then(setSettings);
    }
  }, [user]);

  const isIncrease = percentageChange !== undefined && percentageChange > 0;
  
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: settings?.currency || 'USD' 
    }).format(val);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-headline">{title}</CardTitle>
         {percentageChange === undefined && !sinceDate && <TrendingUp className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono">
          {formatCurrency(value)}
        </div>
        {percentageChange !== undefined ? (
          <div className="text-xs text-muted-foreground flex items-center">
            <span className={cn("flex items-center", isIncrease ? "text-red-500" : "text-green-500")}>
              {isIncrease ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {Math.abs(percentageChange).toFixed(2)}%
            </span>
            <span className="ml-1">{period}</span>
          </div>
        ) : sinceDate ? (
          <p className="text-xs text-muted-foreground">
            Since {sinceDate}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
