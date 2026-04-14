"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import {
  checkAndCreateUserDocument,
  is2faEnabledForUser,
} from "@/lib/firestore";
import { Separator } from "@/components/ui/separator";
import { GoogleLogo } from "@/components/logos/GoogleLogo";
import Image from "next/image";
import { gtagEvent } from "@/lib/analytics";
import { send2faOtp } from "@/app/actions";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const is2faFeatureEnabled = process.env.NEXT_PUBLIC_2FA_ENABLED === "1";

  const handleSuccessfulLogin = async (user: any) => {
    const is2faEnabledForThisUser =
      is2faFeatureEnabled && (await is2faEnabledForUser(user.uid));

    if (is2faEnabledForThisUser) {
      // Send OTP and redirect to verification page
      await send2faOtp(user.uid, user.email!);
      sessionStorage.setItem("pending-2fa-uid", user.uid);
      sessionStorage.setItem("pending-2fa-email", user.email!);
      router.push("/verify-otp");
    } else {
      router.push("/");
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      gtagEvent({ action: "login", category: "Auth", label: "Email/Password" });
      await handleSuccessfulLogin(userCredential.user);
    } catch (error: any) {
      console.error("Login Error:", error);
      let description = "An unexpected error occurred.";
      if (error.code === "auth/invalid-credential") {
        description =
          'Invalid credentials. Please check your email and password. If you signed up with Google, please use the "Sign in with Google" button.';
      } else if (error.code === "auth/user-disabled") {
        description = "This account has been disabled.";
      }

      toast({
        variant: "destructive",
        title: "Login Failed",
        description,
      });
      gtagEvent({
        action: "login_failure",
        category: "Auth",
        label: "Email/Password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await checkAndCreateUserDocument(
        result.user.uid,
        result.user.email || ""
      );
      gtagEvent({ action: "login", category: "Auth", label: "Google" });
      await handleSuccessfulLogin(result.user);
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      toast({
        variant: "destructive",
        title: "Google Sign-In Failed",
        description: "Could not sign in with Google. Please try again.",
      });
      gtagEvent({ action: "login_failure", category: "Auth", label: "Google" });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-2">
            <div className="w-[120px] h-auto">
              <Image
                src="/images/app-logo.png"
                alt="Nexus App Logo"
                width={0}
                height={0}
                sizes="100vw"
                className="w-full h-auto"
              />
            </div>
          </div>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="m@example.com"
                        {...field}
                        disabled={isGoogleLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        disabled={isGoogleLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full flex items-center gap-2"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
          >
            <GoogleLogo />
            {isGoogleLoading ? "Signing in..." : "Sign in with Google"}
          </Button>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline text-primary">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
