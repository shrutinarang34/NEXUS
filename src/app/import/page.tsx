
"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/auth";
import type { Account } from "@/types";
import { getAccounts } from "@/lib/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icon } from "@/components/Icon";

type StatementType = 'bank' | 'credit';

export default function ImportPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [statementType, setStatementType] = useState<StatementType | ''>('');
    const [accountId, setAccountId] = useState<string>('');
    const [accounts, setAccounts] = useState<Account[]>([]);

    useEffect(() => {
        if(user) {
            getAccounts(user.uid).then(setAccounts);
        }
    }, [user]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleNextStep = () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'No file selected', description: 'Please upload a CSV file to continue.' });
            return;
        }

        if (!statementType) {
             toast({ variant: 'destructive', title: 'Statement Type Required', description: 'Please select whether this is a bank or credit card statement.' });
            return;
        }

        if (!accountId) {
             toast({ variant: 'destructive', title: 'Account Required', description: 'Please select the account this statement belongs to.' });
            return;
        }

        setIsLoading(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const headers = results.meta.fields;
                const data = results.data;

                if (!headers || data.length === 0) {
                    toast({ variant: "destructive", title: "Invalid CSV", description: "Could not parse the CSV file or it is empty." });
                    setIsLoading(false);
                    return;
                }

                localStorage.setItem('csv_headers', JSON.stringify(headers));
                localStorage.setItem('csv_data', JSON.stringify(data));
                localStorage.setItem('csv_statement_type', statementType);
                localStorage.setItem('csv_account_id', accountId);

                router.push('/import/map');
            },
            error: (error: any) => {
                toast({ variant: "destructive", title: "CSV Parsing Error", description: error.message });
                setIsLoading(false);
            }
        });
    }
    
    return (
        <AppShell>
            <div className="flex flex-col gap-8 max-w-2xl mx-auto">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Import Transactions - Step 1 of 3</h1>
                    <p className="text-muted-foreground">Upload your CSV file and provide some details to begin.</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>Upload File</CardTitle>
                        <CardDescription>
                            Select or drop a CSV file from your bank or credit card statement.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                            <Upload className="w-12 h-12 text-muted-foreground" />
                            <input type="file" accept=".csv" onChange={handleFileChange} className="mt-4 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                            {file && <p className="mt-2 text-sm text-muted-foreground">Selected: {file.name}</p>}
                            <div className="mt-4 text-xs text-muted-foreground text-center">
                                <Link href="/dummy_expenses.csv" download className="underline hover:text-primary">
                                    Download sample CSV
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader>
                        <CardTitle>Statement Details</CardTitle>
                        <CardDescription>This helps us correctly identify expenses and deposits.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <RadioGroup onValueChange={(value) => setStatementType(value as StatementType)} value={statementType}>
                           <div className="space-y-4">
                               <div className="flex items-center space-x-3 p-4 border rounded-md has-[:checked]:bg-muted">
                                    <RadioGroupItem value="bank" id="r-bank" />
                                    <Label htmlFor="r-bank" className="flex-1 cursor-pointer">
                                        <p className="font-semibold">Bank Statement</p>
                                        <p className="text-sm text-muted-foreground">Contains both deposits (income) and expenses (withdrawals).</p>
                                    </Label>
                               </div>
                               <div className="flex items-center space-x-3 p-4 border rounded-md has-[:checked]:bg-muted">
                                    <RadioGroupItem value="credit" id="r-credit" />
                                    <Label htmlFor="r-credit" className="flex-1 cursor-pointer">
                                        <p className="font-semibold">Credit Card Statement</p>
                                        <p className="text-sm text-muted-foreground">Contains only expenses. Payments to the card will be ignored.</p>
                                    </Label>
                               </div>
                           </div>
                       </RadioGroup>
                       <div className="space-y-2 pt-4">
                           <Label htmlFor="account-select">Account for this Statement</Label>
                            <Select value={accountId} onValueChange={setAccountId}>
                                <SelectTrigger id="account-select">
                                    <SelectValue placeholder="Select an account..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(account => (
                                        <SelectItem key={account.id} value={account.id}>
                                            <div className="flex items-center gap-2">
                                                <Icon name={account.icon || 'Landmark'} />
                                                <span>{account.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                       </div>
                    </CardContent>
                </Card>

                 <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleNextStep} disabled={isLoading}>
                        {isLoading ? 'Processing...' : 'Next: Map Columns'}
                    </Button>
                </div>
            </div>
        </AppShell>
    )
}
