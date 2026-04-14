
"use client";

import type { Category, UserSettings } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Icon } from "@/components/Icon";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getUserSettings } from "@/lib/firestore";

interface CategorySpendingData {
    categoryId: string;
    name: string;
    icon?: string;
    spent: number;
    budgeted: number;
}

interface CategoryPerformanceProps {
    categorySpending: CategorySpendingData[];
}

export function CategoryPerformance({ categorySpending }: CategoryPerformanceProps) {
    const { user } = useAuth();
    const [settings, setSettings] = useState<UserSettings | null>(null);

    useEffect(() => {
        if(user) {
            getUserSettings(user.uid).then(setSettings);
        }
    }, [user]);

    if (categorySpending.length === 0) {
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
            <CardHeader>
                <CardTitle className="font-headline">Category Performance</CardTitle>
                <CardDescription>A breakdown of your spending vs. budget for each category.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {categorySpending.map(item => {
                        const progress = item.budgeted > 0 ? (item.spent / item.budgeted) * 100 : 0;
                        const remaining = item.budgeted - item.spent;
                        const progressColor = progress > 100 ? "bg-red-600" : progress > 80 ? "bg-yellow-500" : "bg-primary";

                        return (
                            <div key={item.categoryId} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Icon name={item.icon || 'Package'} className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{item.name}</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className={remaining < 0 ? "text-red-500 font-semibold" : "text-muted-foreground"}>
                                            {formatCurrency(remaining)}
                                        </span>
                                        <span className="text-muted-foreground"> {remaining >= 0 ? 'left' : 'over'}</span>
                                    </div>
                                </div>
                                <Progress value={progress} indicatorClassName={progressColor} />
                                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                                    <span>{formatCurrency(item.spent)}</span>
                                    <span>{formatCurrency(item.budgeted)}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

