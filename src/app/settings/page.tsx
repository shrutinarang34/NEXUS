

"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { getCategories, getAccounts } from "@/lib/firestore";
import type { Category, Account } from "@/types";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ChevronRight, Landmark, LayoutGrid, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteAccountManager } from "@/components/settings/DeleteAccountManager";
import { FeatureManager } from "@/components/settings/FeatureManager";
import { AppPreferences } from "@/components/settings/DateRangeSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { ProUpsellCard } from "@/components/settings/ProUpsellCard";


export default function SettingsPage() {
  const { user } = useAuth();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchData = async () => {
    if(user) {
        setLoading(true);
        const [userCategories, userAccounts] = await Promise.all([
            getCategories(user.uid),
            getAccounts(user.uid),
        ]);
        setCategories(userCategories);
        setAccounts(userAccounts);
        setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchData();
  }, [user]);

  const settingsItems = [
    {
      href: "/settings/categories",
      icon: <LayoutGrid className="size-5 text-muted-foreground" />,
      title: "Categories",
      description: `${categories.length} categories`,
    },
    {
      href: "/settings/accounts",
      icon: <Landmark className="size-5 text-muted-foreground" />,
      title: "Accounts",
      description: `${accounts.length} accounts`,
    },
     {
      href: "/settings/household",
      icon: <Users className="size-5 text-muted-foreground" />,
      title: "Household",
      description: "Manage who you split expenses with.",
    },
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Settings</h1>
          <p className="text-muted-foreground">
            Manage your app settings and configurations.
          </p>
        </header>

        <ProUpsellCard />
        <AppPreferences />
        <SecuritySettings />
        <FeatureManager />

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Data Management</CardTitle>
            <CardDescription>
              Manage your personal data like categories and accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            ) : (
            <Table>
              <TableBody>
                {settingsItems.map((item) => (
                  <TableRow key={item.href} className="cursor-pointer">
                    <TableCell className="p-0">
                      <Link href={item.href} className="flex items-center p-4">
                        <div className="mr-4">{item.icon}</div>
                        <div className="flex-1">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <ChevronRight className="size-5 text-muted-foreground" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
        
        <DeleteAccountManager />

      </div>
    </AppShell>
  );
}
