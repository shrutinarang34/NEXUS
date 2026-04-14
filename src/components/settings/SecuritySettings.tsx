

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
import { gtagEvent } from "@/lib/analytics";
import { ShieldCheck } from "lucide-react";
import { send2faOtp } from "@/app/actions";

const is2faFeatureEnabled = process.env.NEXT_PUBLIC_2FA_ENABLED === '1';

export function SecuritySettings() {
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

  const handle2faToggle = async () => {
    if (!user || !settings) return;

    const isCurrentlyEnabled = settings.security?.is2faEnabled ?? false;
    const new2faState = !isCurrentlyEnabled;

    const oldSettings = settings;
    setSettings(prev => ({
        ...prev!,
        security: { ...prev?.security, is2faEnabled: new2faState }
    }));

    try {
      await updateUserSettings(user.uid, { 
        security: {
            ...settings.security,
            is2faEnabled: new2faState 
        }
      });
      toast({ description: `Two-Factor Authentication ${new2faState ? 'enabled' : 'disabled'}.` });
      
      // Send an OTP email when the user enables it for the first time
      if(new2faState) {
        await send2faOtp(user.uid, user.email!);
        toast({ description: 'A verification code has been sent to your email to complete future logins.'});
      }
      
      gtagEvent({ action: 'toggle_2fa', category: 'Security', label: new2faState ? 'Enabled' : 'Disabled' });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update security settings.",
      });
      setSettings(oldSettings); // Revert on error
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

  console.log(process.env.NEXT_PUBLIC_2FA_ENABLED);
  if (!is2faFeatureEnabled) {
      return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Security</CardTitle>
        <CardDescription>
          Manage your account security settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
             <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5" />
                <div className="space-y-0.5">
                    <Label htmlFor="2fa-switch">Two-Factor Authentication</Label>
                    <p className="text-xs text-muted-foreground">
                        Require an email code upon login for extra security.
                    </p>
                </div>
            </div>
            <Switch
                id="2fa-switch"
                checked={settings?.security?.is2faEnabled ?? false}
                onCheckedChange={handle2faToggle}
            />
        </div>
      </CardContent>
    </Card>
  );
}
