
"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { useAuth } from "@/lib/auth";
import { getCategories } from "@/lib/firestore";
import type { Category } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesSettingsPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (user) {
      setLoading(true);
      const userCategories = await getCategories(user.uid);
      setCategories(userCategories);
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
            <CategoryManager
            categories={categories}
            onCategoriesChange={fetchData}
            />
        )}
      </div>
    </AppShell>
  );
}
