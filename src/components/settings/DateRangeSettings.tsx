
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getUserSettings, updateUserSettings } from "@/lib/firestore";
import type { UserSettings, DefaultDateRange } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { gtagEvent } from "@/lib/analytics";
import { currencies } from "@/lib/currencies";
import { ScrollArea } from "../ui/scroll-area";

const dateRangeOptions: { value: DefaultDateRange, label: string }[] = [
    { value: 'this_month', label: 'This Month' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'ytd', label: 'Year-to-Date' },
];

export function AppPreferences() {
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

  const handleRangeChange = async (value: DefaultDateRange) => {
    if (!user || !settings) return;

    const oldRange = settings.defaultDateRange;
    setSettings({ ...settings, defaultDateRange: value }); // Optimistic update

    try {
      await updateUserSettings(user.uid, { defaultDateRange: value });
      toast({ description: `Default date range updated.` });
      gtagEvent({ action: 'update_setting', category: 'Settings', label: 'Default Date Range', value: dateRangeOptions.findIndex(o => o.value === value) });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update date range settings.",
      });
      setSettings({ ...settings, defaultDateRange: oldRange });
    }
  };
  
  const handleCurrencyChange = async (value: string) => {
    if (!user || !settings) return;

    const oldCurrency = settings.currency;
    setSettings({ ...settings, currency: value });

    try {
      await updateUserSettings(user.uid, { currency: value });
      toast({ description: `Default currency updated.` });
      gtagEvent({ action: 'update_setting', category: 'Settings', label: 'Default Currency' });
      window.location.reload();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update currency settings.",
      });
      setSettings({ ...settings, currency: oldCurrency });
    }
  };


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">App Preferences</CardTitle>
        <CardDescription>
          Customize default application behaviors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
            <Label htmlFor="date-range-select" className="font-medium">Default Date Range</Label>
             <Select
                value={settings?.defaultDateRange || 'ytd'}
                onValueChange={(value: DefaultDateRange) => handleRangeChange(value)}
            >
                <SelectTrigger id="date-range-select" className="w-[180px]">
                    <SelectValue placeholder="Select range..." />
                </SelectTrigger>
                <SelectContent>
                {dateRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                    {option.label}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>
        <div className="flex items-center justify-between">
            <Label htmlFor="currency-select" className="font-medium">Default Currency</Label>
            <Select
                value={settings?.currency || 'USD'}
                onValueChange={(value: string) => handleCurrencyChange(value)}
            >
                <SelectTrigger id="currency-select" className="w-[180px]">
                    <SelectValue placeholder="Select currency..." />
                </SelectTrigger>
                <SelectContent>
                    <ScrollArea className="h-72">
                    {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                        {currency.name} ({currency.code})
                        </SelectItem>
                    ))}
                    </ScrollArea>
                </SelectContent>
            </Select>
        </div>
      </CardContent>
    </Card>
  );
}
