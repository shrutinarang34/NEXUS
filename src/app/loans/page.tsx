
"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { getPersons, getLoanTransactions, getUserSettings } from "@/lib/loans";
import { getAccounts } from "@/lib/firestore";
import type { Person, Account, LoanTransaction, UserSettings } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { LoanManager } from "@/components/loans/LoanManager";
import { useRouter } from "next/navigation";

export default function LoansPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [persons, setPersons] = useState<Person[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<LoanTransaction[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getUserSettings(user.uid).then(userSettings => {
        if (!userSettings?.featureFlags.loans) {
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
      const [userPersons, userAccounts, userTransactions, userSettings] = await Promise.all([
        getPersons(user.uid),
        getAccounts(user.uid),
        getLoanTransactions(user.uid),
        getUserSettings(user.uid),
      ]);
      setPersons(userPersons);
      setAccounts(userAccounts);
      setTransactions(userTransactions);
      setSettings(userSettings);
      setLoading(false);
    }
  };

  if (!settings) {
    return <AppShell><Skeleton className="h-96 w-full" /></AppShell>;
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
            <LoanManager
                persons={persons}
                accounts={accounts}
                transactions={transactions}
                onDataChange={fetchData}
                settings={settings}
            />
        )}
      </div>
    </AppShell>
  );
}
