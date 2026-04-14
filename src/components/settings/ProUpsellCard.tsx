"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getUserSettings } from "@/lib/firestore";
import type { UserSettings } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

export function ProUpsellCard() {
  const { user } = useAuth();
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

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (settings?.isProUser) {
    return null; // Don't show the card if the user is already PRO
  }

  const proFeatures = [
    "AI-powered insights for expenses, cashback, and accounts.",
    "Auto-categorization for new expenses using AI.",
    "Import bank or credit card statements (CSV) with AI analysis.",
    "Track personal loans with friends and family.",
  ];

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-amber-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
      <Card className="relative">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <CardTitle className="!text-3xl font-headline text-primary">
              Join Nexus Pro
            </CardTitle>
          </div>
          <CardDescription>
            Unlock the full potential of your financial management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-foreground/80">
            {proFeatures.map((feature, index) => (
              <li key={index} className="flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-green-500 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="pt-4">
            <Link
              href="https://beeclue.com/Nexus"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full font-bold" size="lg">
                Join Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
