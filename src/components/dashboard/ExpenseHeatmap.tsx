

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { UserSettings } from "@/types";
import { useAuth } from "@/lib/auth";
import { getUserSettings } from "@/lib/firestore";

interface HeatmapData {
    category: string;
    spending: number[];
}

interface ExpenseHeatmapProps {
    data: HeatmapData[];
    months: string[];
}

export function ExpenseHeatmap({ data, months }: ExpenseHeatmapProps) {
    const { user } = useAuth();
    const [settings, setSettings] = React.useState<UserSettings | null>(null);

    React.useEffect(() => {
      if(user) {
          getUserSettings(user.uid).then(setSettings);
      }
    }, [user]);

    // Calculate min/max for each month individually
    const monthlyStats = months.map((_, monthIndex) => {
        const spendingForMonth = data.map(d => d.spending[monthIndex]).filter(s => s > 0);
        if (spendingForMonth.length === 0) {
            return { min: 0, max: 0 };
        }
        return {
            min: Math.min(...spendingForMonth),
            max: Math.max(...spendingForMonth),
        };
    });
    
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
                Not enough data to display heatmap.
            </div>
        );
    }
    
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: settings?.currency || 'USD' 
        }).format(val);
    }

    return (
        <TooltipProvider>
            <div className="overflow-x-auto">
                <div className="grid gap-px" style={{ gridTemplateColumns: `150px repeat(${months.length}, 1fr)` }}>
                    {/* Header: Category */}
                    <div className="sticky left-0 font-semibold text-xs text-muted-foreground uppercase py-2 bg-background z-10">Category</div>
                    {/* Header: Months */}
                    {months.map(month => (
                        <div key={month} className="text-center font-semibold text-xs text-muted-foreground uppercase py-2">{month}</div>
                    ))}

                    {/* Data Rows */}
                    {data.map(({ category, spending }) => (
                        <React.Fragment key={category}>
                            <div className="sticky left-0 font-medium text-sm py-2 truncate bg-background z-10 pr-2">{category}</div>
                            {spending.map((amount, index) => {
                                let opacity = 0.3; // Base opacity for zero values
                                if (amount > 0) {
                                    const { min, max } = monthlyStats[index];
                                    const range = max - min;
                                    if (range > 0) {
                                        const intensity = (amount - min) / range;
                                        opacity = 0.2 + (intensity * 0.8); // Scale from 20% to 100%
                                    } else {
                                        opacity = 0.6; // Single non-zero value
                                    }
                                }

                                const style = {
                                    backgroundColor: amount > 0 ? `hsl(var(--primary) / ${opacity})` : 'hsl(var(--muted) / 0.3)',
                                };
                                
                                return (
                                    <Tooltip key={index} delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <div className={cn("h-full w-full rounded-sm min-h-[30px]")} style={style}></div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{formatCurrency(amount)}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </TooltipProvider>
    );
}
