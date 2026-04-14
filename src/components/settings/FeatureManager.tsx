
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getUserSettings, updateUserSettings } from "@/lib/firestore";
import type { UserSettings } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { HandCoins, Target, ArrowRightLeft, Sparkles, Repeat } from 'lucide-react';
import { Badge } from "../ui/badge";
import { gtagEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function FeatureManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(true);
      getUserSettings(user.uid)
        .then(setSettings)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleToggle = async (feature: keyof UserSettings['featureFlags']) => {
    if (!user || !settings) return;

    const newFlags = { ...settings.featureFlags, [feature]: !settings.featureFlags[feature] };
    
    // Optimistic UI update
    const oldSettings = settings;
    setSettings({ ...settings, featureFlags: newFlags });

    try {
      await updateUserSettings(user.uid, { featureFlags: newFlags });
      toast({ description: `${feature.charAt(0).toUpperCase() + feature.slice(1)} settings updated.` });
      gtagEvent({ action: 'toggle_feature', category: 'Settings', label: feature, value: newFlags[feature] ? 1 : 0 });
      // A full page reload might be easiest to ensure all components get the new state
      if(feature !== 'monthlyReport'){
        window.location.reload();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update settings.",
      });
      // Revert UI on error
      setSettings(oldSettings);
    }
  };

  const featureToggles = [
    { id: 'recurring', label: 'Recurring Items', description: 'Automate expenses and transactions.', icon: Repeat, isPro: false, isAi: false },
    { id: 'budgets', label: 'Budgets', description: 'Manage spending goals and allocations.', icon: Target, isPro: false, isAi: false },
    { id: 'loans', label: 'Loans', description: 'Track money lent or borrowed.', icon: HandCoins, isPro: true, isAi: false },
    { id: 'transactions', label: 'Accounts / Transactions', description: 'Manage account balances and transfers.', icon: ArrowRightLeft, isPro: false, isAi: false },
    { id: 'aiInsights', label: 'AI Insights', description: 'Get AI-powered insights on your finances.', icon: Sparkles, isPro: true, isAi: true },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isProUser = settings?.isProUser ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Feature Management</CardTitle>
        <CardDescription>
          Enable or disable application modules to customize your experience.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {featureToggles.map((feature) => {
          const isProFeatureAndNotProUser = feature.isPro && !isProUser;
          const cardClass = cn(
            "flex items-center justify-between rounded-lg border p-3 shadow-sm",
            feature.isAi && "ai-glass-card",
            isProFeatureAndNotProUser && "bg-muted/50 opacity-60 cursor-not-allowed"
          );
          const Icon = feature.icon;
          const iconClass = feature.isAi ? "text-yellow-400" : "";
          const switchId = `${feature.id}-switch`;
          
          return (
            <div key={feature.id} className={cardClass}>
              <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${iconClass}`} />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <Label htmlFor={switchId} className={cn(isProFeatureAndNotProUser && 'cursor-not-allowed')}>{feature.label}</Label>
                        {feature.isPro && <Badge variant="destructive">PRO</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {feature.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={switchId}
                  checked={settings?.featureFlags[feature.id as keyof UserSettings['featureFlags']] ?? true}
                  onCheckedChange={() => handleToggle(feature.id as keyof UserSettings['featureFlags'])}
                  disabled={isProFeatureAndNotProUser}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  );
}
