

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gtagEvent } from "@/lib/analytics";

export function DeleteAccountManager() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }
    if (confirmationText !== "DELETE") {
      toast({ variant: "destructive", title: "Error", description: "Confirmation text does not match." });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteUserAccount(user);
      toast({ title: "Account Deleted", description: "Your account and all associated data have been permanently deleted." });
      gtagEvent({ action: 'delete_account', category: 'Account', label: 'User Account Deletion' });
      router.push("/signup");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message || "An unexpected error occurred. You may need to log in again to complete this action.",
      });
      gtagEvent({ action: 'delete_account_failure', category: 'Error', label: 'User Account Deletion Failed' });
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive">
        <CardHeader>
            <CardTitle className="font-headline text-destructive">Danger Zone</CardTitle>
            <CardDescription>
                This is a permanent action. Please proceed with caution.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row items-center justify-between">
                <div>
                    <p className="font-semibold">Delete Your Account</p>
                    <p className="text-sm text-muted-foreground">Once you delete your account, there is no going back.</p>
                </div>
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete My Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove all your data from our servers.
                        You can create a new account with the same email, but your data will not be restored.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="delete-confirm">Please type <span className="font-bold text-foreground">DELETE</span> to confirm.</Label>
                        <Input 
                            id="delete-confirm"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                        />
                    </div>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={confirmationText !== "DELETE" || isDeleting}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                       {isDeleting ? "Deleting..." : "Delete My Account"}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardContent>
    </Card>
  );
}
