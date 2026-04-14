"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sendEmailVerification } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";

export default function VerifyEmailPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const is2faFeatureEnabled = process.env.NEXT_PUBLIC_2FA_ENABLED === "1";

  useEffect(() => {
    if (!loading && user?.emailVerified) {
      if (is2faFeatureEnabled) {
        router.push("/setup-2fa");
      } else {
        router.push("/");
      }
    }
  }, [user, loading, router, is2faFeatureEnabled]);

  const handleResendEmail = async () => {
    if (!user) return;
    setIsSending(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox (and spam folder).",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Failed to send verification email. Please try again shortly.",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (loading || (!loading && user?.emailVerified)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <Image
              src="/images/app-logo.png"
              alt="Nexus Logo"
              width={80}
              height={80}
            />
          </div>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to{" "}
            <span className="font-semibold text-foreground">{user?.email}</span>
            . Please click the link to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Once verified, you may need to refresh this page or log in again.
          </p>
          <Button
            onClick={handleResendEmail}
            disabled={isSending}
            className="w-full"
          >
            {isSending ? (
              <Spinner size="small" color="white" />
            ) : (
              "Resend Verification Email"
            )}
          </Button>
          <Button variant="ghost" onClick={logout} className="w-full">
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
