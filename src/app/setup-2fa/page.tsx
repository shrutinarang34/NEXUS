

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { updateUserSettings } from '@/lib/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { gtagEvent } from '@/lib/analytics';

export default function Setup2FAPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handle2faChoice = async (enable: boolean) => {
        if (!user) return;
        setIsLoading(true);

        try {
            await updateUserSettings(user.uid, {
                security: {
                    is2faEnabled: enable
                }
            });
            
            // Mark that the user has completed this setup step
            localStorage.setItem(`2fa-prompt-${user.uid}`, 'true');

            toast({
                title: 'Security setting saved',
                description: `Two-Factor Authentication has been ${enable ? 'enabled' : 'disabled'}.`
            });
            gtagEvent({ action: 'setup_2fa', category: 'Auth', label: enable ? 'Enabled' : 'Disabled' });
            router.push('/');
        } catch (error) {
            console.error("Failed to update 2FA setting:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save your setting. Please try again.' });
            setIsLoading(false);
        }
    };

    if (!user) {
        return (
             <div className="flex h-screen items-center justify-center">
                <Spinner size="large" />
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Enhance Your Account Security</CardTitle>
                    <CardDescription>
                        Add an extra layer of security to your account with Two-Factor Authentication (2FA). When you log in, we'll send a one-time code to your email.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                        variant="outline"
                        className="h-auto p-6 flex flex-col gap-2"
                        onClick={() => handle2faChoice(true)}
                        disabled={isLoading}
                    >
                        <ShieldCheck className="h-8 w-8 text-green-500" />
                        <span className="font-semibold">Enable 2FA</span>
                        <span className="text-xs text-muted-foreground">Highly Recommended</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-auto p-6 flex flex-col gap-2"
                        onClick={() => handle2faChoice(false)}
                        disabled={isLoading}
                    >
                        <ShieldOff className="h-8 w-8 text-muted-foreground" />
                        <span className="font-semibold">Skip for Now</span>
                         <span className="text-xs text-muted-foreground">You can enable it later in settings</span>
                    </Button>
                </CardContent>
                 {isLoading && (
                    <CardFooter className="flex justify-center">
                       <Spinner size="medium" />
                    </CardFooter>
                 )}
            </Card>
        </div>
    );
}
