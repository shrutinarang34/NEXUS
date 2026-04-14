
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb } from "lucide-react";

interface FinancialInsightsProps {
    title: string;
    insights?: string;
    isLoading: boolean;
}

export function FinancialInsights({ title, insights, isLoading }: FinancialInsightsProps) {
    if (isLoading) {
        return (
             <div className="ai-loader-container">
                <div className="ai-loader-content flex items-center justify-center p-4">
                     <p className="text-sm text-muted-foreground animate-pulse">Generating insights...</p>
                </div>
            </div>
        )
    }

    if (!insights) {
        return null;
    }

    return (
        <div className="ai-glass-card">
            <CardHeader className="flex flex-row items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-400" />
                <CardTitle className="font-headline text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-foreground/80">{insights}</p>
            </CardContent>
        </div>
    );
}
