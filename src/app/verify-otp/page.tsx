
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { verifyOtp, send2faOtp } from '@/app/actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Label } from '@/components/ui/label';

export default function VerifyOtpPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const getSessionData = React.useCallback(() => {
        const uid = sessionStorage.getItem('pending-2fa-uid');
        const email = sessionStorage.getItem('pending-2fa-email');
        if (!uid || !email) {
            router.push('/login'); // Automatically redirect
            return null;
        }
        return { uid, email };
    }, [router]);

    useEffect(() => {
        if (!getSessionData()) {
            // Initial check
        }
    }, [getSessionData]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        } else {
            setIsResending(false);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleResend = async () => {
        setIsResending(true);
        setCountdown(5);

        const sessionData = getSessionData();
        if (!sessionData) {
            toast({ variant: 'destructive', title: 'Session Error', description: 'Your session has expired. Please log in again.' });
            return;
        };
        
        try {
            const success = await send2faOtp(sessionData.uid, sessionData.email);
            console.log(success);
            if (success) {
                 toast({ title: 'OTP Resent', description: 'A new verification code has been sent to your email.' });
            } else {
                 toast({ variant: 'destructive', title: 'Failed to Resend', description: 'Could not send a new code. Please try again later.' });
                 setCountdown(0);
            }
        } catch (error) {
            alert(error);
             toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
             setCountdown(0);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const sessionData = getSessionData();
        if (!sessionData) {
            setIsLoading(false);
            return;
        }

        if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
            toast({ variant: 'destructive', title: 'Invalid OTP', description: 'Please enter a valid 6-digit OTP.' });
            setIsLoading(false);
            return;
        }

        try {
            const isValid = await verifyOtp(sessionData.uid, otp);

            if (isValid) {
                toast({ title: 'Success!', description: 'You have been successfully authenticated.' });
                sessionStorage.setItem('2fa-verified', 'true');
                sessionStorage.removeItem('pending-2fa-uid');
                sessionStorage.removeItem('pending-2fa-email');
                router.push('/');
            } else {
                toast({ variant: 'destructive', title: 'Invalid OTP', description: 'The OTP you entered is incorrect or has expired.' });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Verification Failed', description: 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>An email has been sent to you with a 6-digit verification code.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="otp">Verification Code</Label>
                            <Input
                                id="otp"
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength={6}
                                placeholder="_ _ _ _ _ _"
                                className="text-center text-lg tracking-[0.5em]"
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading || isResending}>
                            {isLoading ? <Spinner size="small" color="white"/> : 'Verify'}
                        </Button>
                    </form>
                    <div className="mt-4 text-center">
                        <Button
                            variant="link"
                            onClick={handleResend}
                            disabled={isResending || isLoading}
                            className="text-sm"
                        >
                            {isResending ? `Resend in ${countdown}s` : "Didn't receive a code? Resend"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
