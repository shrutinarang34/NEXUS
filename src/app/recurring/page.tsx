"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import {
  getRecurringItems,
  getCategories,
  getAccounts,
  getUserSettings,
  processRecurringItems,
} from "@/lib/firestore";
import { getHouseholdUsers } from "@/lib/loans";
import type {
  RecurringItem,
  Category,
  Account,
  HouseholdUser,
  UserSettings,
} from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlusCircle, RefreshCw } from "lucide-react";
import { RecurringItemsDataTable } from "@/components/recurring/RecurringItemsDataTable";
import { RecurringItemForm } from "@/components/recurring/RecurringItemForm";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { gtagEvent } from "@/lib/analytics";

export default function RecurringPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [householdUsers, setHouseholdUsers] = useState<HouseholdUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringItem | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    if (user) {
      getUserSettings(user.uid).then((userSettings) => {
        if (!userSettings?.featureFlags.recurring) {
          router.push("/");
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
      try {
        const [items, userCategories, userAccounts, hUsers] = await Promise.all(
          [
            getRecurringItems(user.uid),
            getCategories(user.uid),
            getAccounts(user.uid),
            getHouseholdUsers(user.uid),
          ]
        );
        setRecurringItems(items);
        setCategories(userCategories);
        setAccounts(userAccounts);
        setHouseholdUsers(hUsers);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const onFormSubmit = () => {
    fetchData();
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleEdit = (item: RecurringItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleProcessItems = async () => {
    if (!user) return;
    setIsProcessing(true);
    gtagEvent({
      action: "process_recurring_manual",
      category: "Recurring",
      label: "Manual Process",
    });
    try {
      const itemsProcessed = await processRecurringItems(user.uid);
      toast({
        title: "Processing Complete",
        description: `${itemsProcessed} item(s) were processed.`,
      });
      fetchData(); // Refresh the list
    } catch (error) {
      console.error("Failed to process items:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not process recurring items.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!settings) {
    return (
      <AppShell>
        <Skeleton className="h-96 w-full" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">
              Recurring Items
            </h1>
            <p className="text-muted-foreground">
              Manage your recurring expenses and transactions.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleProcessItems}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Spinner size="small" className="mr-2" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isProcessing ? "Processing..." : "Process Items"}
            </Button>
            <Button onClick={handleCreate}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New
            </Button>
          </div>
        </header>

        {loading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <RecurringItemsDataTable
            data={recurringItems}
            onDataChanged={fetchData}
            onEdit={handleEdit}
            categories={categories}
            accounts={accounts}
          />
        )}
      </div>

      <RecurringItemForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        item={editingItem}
        onFormSubmit={onFormSubmit}
        categories={categories}
        accounts={accounts}
        householdUsers={householdUsers}
      />
    </AppShell>
  );
}
