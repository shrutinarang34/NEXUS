
"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { AccountManager } from "@/components/settings/AccountManager";
import { useAuth } from "@/lib/auth";
import { getAccounts } from "@/lib/firestore";
import type { Account } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountsSettingsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (user) {
      setLoading(true);
      const userAccounts = await getAccounts(user.uid);
      setAccounts(userAccounts);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        {loading ? (
            <div className="space-y-4">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-64 w-full" />
            </div>
        ) : (
            <AccountManager
                accounts={accounts}
                onAccountsChange={fetchData}
            />
        )}
      </div>
    </AppShell>
  );
}
