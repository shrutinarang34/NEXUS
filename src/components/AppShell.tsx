"use client";

import {
  Home,
  Settings,
  LogOut,
  Wallet,
  ArrowRightLeft,
  PanelLeft,
  Repeat,
  Target,
  HandCoins,
  Lock,
} from "lucide-react";
import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "./ui/button";
import Link from "next/link";
import { Skeleton } from "./ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "./ThemeToggle";
import Image from "next/image";
import { getUserSettings } from "@/lib/firestore";
import { UserSettings } from "@/types";
import { cn } from "@/lib/utils";
import packageJson from "@/../package.json";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { gtagEvent } from "@/lib/analytics";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [settings, setSettings] = React.useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      getUserSettings(user.uid).then((userSettings) => {
        setSettings(userSettings);
        setSettingsLoading(false);
      });
    }
  }, [user]);

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      gtagEvent({ action: "logout", category: "Auth", label: "User Logout" });
      router.push("/login");
    } catch (error) {
      console.error("Failed to log out", error);
      setIsLoggingOut(false);
    }
  };

  if (loading || !user || settingsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const featureFlags = settings?.featureFlags || {
    loans: true,
    budgets: true,
    transactions: true,
    aiInsights: true,
    recurring: true,
  };
  const isProUser = settings?.isProUser ?? false;

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home, disabled: false },
    { href: "/expenses", label: "Expenses", icon: Wallet, disabled: false },
    {
      href: "/recurring",
      label: "Recurring",
      icon: Repeat,
      disabled: !featureFlags.recurring,
    },
    {
      href: "/budgets",
      label: "Budgets",
      icon: Target,
      disabled: !featureFlags.budgets,
    },
    {
      href: "/loans",
      label: "Loans",
      icon: HandCoins,
      disabled: !featureFlags.loans,
      isPro: true,
    },
    {
      href: "/transactions",
      label: "Transactions",
      icon: ArrowRightLeft,
      disabled: !featureFlags.transactions,
    },
    { href: "/settings", label: "Settings", icon: Settings, disabled: false },
  ];

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  };

  const sidebarContent = (
    <>
      <div className="px-2">
        <div className="flex h-16 items-center px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="w-[80%] h-auto">
              <Image
                src="/images/app-logo.png"
                alt="Nexus App Logo"
                width={0}
                height={0}
                sizes="100vw"
                className="w-full h-auto"
              />
            </div>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium">
            <TooltipProvider>
              {navItems.map((item) => (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => !item.disabled && handleLinkClick()}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all",
                        {
                          "hover:text-primary": !item.disabled,
                          "cursor-not-allowed opacity-50": item.disabled,
                          "bg-muted text-primary":
                            pathname === item.href && !item.disabled,
                        }
                      )}
                    >
                      {item.disabled ? (
                        <>
                          <item.icon className="h-4 w-4" />
                          {item.label}
                          {item.isPro && <Lock className="ml-auto h-3 w-3" />}
                        </>
                      ) : (
                        <Link
                          href={item.href}
                          className="flex items-center gap-3 w-full"
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.disabled
                      ? `${item.label} (PRO feature - enable in settings)`
                      : item.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </nav>
        </div>
      </div>
      <div className="mt-auto p-4 border-t">
        <div className="text-xs text-muted-foreground mb-2">
          Signed in as: <br />
          <div className="flex items-center gap-2 mt-1">
            <span className="font-semibold text-foreground truncate">
              {user.email}
            </span>
            {isProUser && <Badge variant="destructive">PRO</Badge>}
          </div>
        </div>
        {settings?.lastLogin && (
          <div className="text-xs text-muted-foreground mt-2">
            Last login: {format(settings.lastLogin.toDate(), "PPP p")}
          </div>
        )}
        <Button
          size="sm"
          className="w-full justify-start mt-2"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? "Logging out..." : "Log out"}
        </Button>
      </div>
    </>
  );

  const currentYear = new Date().getFullYear();
  const appVersion = packageJson.version;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:flex flex-col sticky top-0 h-screen">
        {sidebarContent}
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 sticky top-0 bg-background z-10">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <SheetHeader>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              </SheetHeader>
              {sidebarContent}
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {/* Can add search here if needed */}
          </div>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
        <footer className="border-t bg-muted/40 p-4 text-xs text-muted-foreground hidden md:block">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span>&copy; {currentYear} Nexus.</span>
              <Link
                href="/release-notes"
                className="underline hover:text-primary"
              >
                <span>App Version: {appVersion}</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="underline hover:text-primary">
                Terms
              </Link>
              <Link href="/privacy" className="underline hover:text-primary">
                Privacy
              </Link>
              <div className="flex items-center gap-1">
                <span>Powered by</span>
                <a
                  href="https://beeclue.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary"
                >
                  Beeclue
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
