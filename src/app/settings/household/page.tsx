
"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { HouseholdManager } from "@/components/settings/HouseholdManager";
import { useAuth } from "@/lib/auth";
import { getHouseholdUsers } from "@/lib/loans";
import type { HouseholdUser } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function HouseholdSettingsPage() {
  const { user } = useAuth();
  const [householdUsers, setHouseholdUsers] = useState<HouseholdUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (user) {
      setLoading(true);
      const users = await getHouseholdUsers(user.uid);
      setHouseholdUsers(users);
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
            <HouseholdManager
                householdUsers={householdUsers}
                onHouseholdUsersChange={fetchData}
            />
        )}
      </div>
    </AppShell>
  );
}
