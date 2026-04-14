
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { getCategories, addBulkExpenses, getAccounts, addBulkTransactions } from '@/lib/firestore';
import type { Category, Account, Expense, Transaction } from '@/types';
import { suggestCategoriesBulk } from '@/ai/flows/suggest-categories-bulk-flow';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Timestamp } from 'firebase/firestore';
import { ArrowRight, Check, Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { gtagEvent } from '@/lib/analytics';
import { Icon } from '@/components/Icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';


type CsvData = { [key: string]: string };
type ReviewItem = {
    id: number;
    date: Date;
    description: string;
    amount: number;
    categoryId: string;
    accountId: string;
    error?: boolean;
};
type ReviewDeposit = {
    id: number;
    date: Date;
    description: string;
    amount: number;
    accountId: string;
};

export default function ReviewPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
    const [reviewDeposits, setReviewDeposits] = useState<ReviewDeposit[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            const storedData = localStorage.getItem('csv_data');
            const storedMappings = localStorage.getItem('csv_mappings');
            const statementType = localStorage.getItem('csv_statement_type');
            const accountId = localStorage.getItem('csv_account_id');

            if (!storedData || !storedMappings || !statementType || !accountId) {
                toast({ variant: 'destructive', title: 'Error', description: 'Import data not found. Please start over.' });
                router.push('/import');
                return;
            }

            const [userCategories, userAccounts] = await Promise.all([
                getCategories(user.uid),
                getAccounts(user.uid),
            ]);
            setCategories(userCategories);
            setAccounts(userAccounts);

            const data: CsvData[] = JSON.parse(storedData);
            const mappings: { [key: string]: string } = JSON.parse(storedMappings);
            const dateColumn = Object.keys(mappings).find(key => mappings[key] === 'date')!;
            const descriptionColumn = Object.keys(mappings).find(key => mappings[key] === 'description')!;
            const amountColumn = Object.keys(mappings).find(key => mappings[key] === 'amount');
            const debitColumn = Object.keys(mappings).find(key => mappings[key] === 'debit');
            const creditColumn = Object.keys(mappings).find(key => mappings[key] === 'credit');

            let processedExpenses: Omit<ReviewItem, 'categoryId' | 'error'>[] = [];
            let processedDeposits: ReviewDeposit[] = [];
            
            data.forEach((row, index) => {
                const date = new Date(row[dateColumn]);
                const description = row[descriptionColumn];
                
                if (isNaN(date.getTime()) || !description) return;

                let amount = 0;
                let isExpense = false;
                let isDeposit = false;

                if (statementType === 'bank') {
                    if (amountColumn) {
                        const parsedAmount = parseFloat(row[amountColumn]);
                        if (parsedAmount < 0) {
                            isExpense = true;
                            amount = Math.abs(parsedAmount);
                        } else if (parsedAmount > 0) {
                            isDeposit = true;
                            amount = parsedAmount;
                        }
                    } else if (debitColumn && creditColumn) {
                        const debit = parseFloat(row[debitColumn]) || 0;
                        const credit = parseFloat(row[creditColumn]) || 0;
                        if (debit > 0) {
                            isExpense = true;
                            amount = debit;
                        } else if (credit > 0) {
                            isDeposit = true;
                            amount = credit;
                        }
                    }
                } else if (statementType === 'credit') {
                    if (amountColumn) {
                        const parsedAmount = parseFloat(row[amountColumn]);
                        if (parsedAmount > 0) {
                            isExpense = true;
                            amount = parsedAmount;
                        }
                    } else if (debitColumn) {
                        const debit = parseFloat(row[debitColumn]) || 0;
                        if (debit > 0) {
                            isExpense = true;
                            amount = debit;
                        }
                    }
                }

                if (isExpense) {
                    processedExpenses.push({ id: index, date, description, amount, accountId });
                } else if (isDeposit) {
                    processedDeposits.push({ id: index, date, description, amount, accountId: accountId });
                }
            });
            
            setReviewItems(processedExpenses.map(item => ({ ...item, categoryId: '' })));
            setReviewDeposits(processedDeposits);
            
            if (processedExpenses.length > 0) {
                const itemsToCategorize = processedExpenses.map(item => ({ id: item.id.toString(), description: item.description }));
                try {
                    const suggestions = await suggestCategoriesBulk({ items: itemsToCategorize, categories: userCategories });
                    const suggestedCategoriesMap = new Map(suggestions.map(s => [parseInt(s.id), s.categoryId]));

                    setReviewItems(currentItems => currentItems.map(item => ({
                        ...item,
                        categoryId: suggestedCategoriesMap.get(item.id) || '',
                    })));
                } catch (e) {
                    console.error("AI categorization failed, proceeding without suggestions.", e);
                }
            }

            setLoading(false);
        };

        loadData();
    }, [user, router, toast]);

    const handleCategoryChange = (index: number, categoryId: string) => {
        const newItems = [...reviewItems];
        newItems[index].categoryId = categoryId;
        newItems[index].error = false;
        setReviewItems(newItems);
    };

    const handleExpenseDescriptionChange = (index: number, newDescription: string) => {
        const newItems = [...reviewItems];
        newItems[index].description = newDescription;
        setReviewItems(newItems);
    }
    
    const handleDepositDescriptionChange = (index: number, newDescription: string) => {
        const newItems = [...reviewDeposits];
        newItems[index].description = newDescription;
        setReviewDeposits(newItems);
    }

    const handleDeleteExpense = (id: number) => {
        setReviewItems(prev => prev.filter(item => item.id !== id));
    };

    const handleDeleteDeposit = (id: number) => {
        setReviewDeposits(prev => prev.filter(item => item.id !== id));
    };


    const handleFinishImport = async () => {
        if (!user) return;
        let allExpensesValid = true;
        reviewItems.forEach((item, index) => {
            if (!item.categoryId) {
                const newItems = [...reviewItems];
                newItems[index].error = true;
                setReviewItems(newItems);
                allExpensesValid = false;
            }
        });

        if (!allExpensesValid) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a category for all highlighted expenses.' });
            return;
        }
        
        if (reviewItems.length === 0 && reviewDeposits.length === 0) {
            toast({ title: 'Nothing to Import', description: 'No valid expenses or deposits were found to import.' });
            router.push('/expenses');
            return;
        }

        setIsImporting(true);

        const expensesToCreate: Omit<Expense, 'id' | 'createdAt' | 'userId'>[] = reviewItems.map(item => ({
            name: item.description,
            amount: item.amount,
            date: Timestamp.fromDate(item.date),
            categoryId: item.categoryId,
            accountId: item.accountId,
            isImported: true,
        }));
        
        const depositsToCreate: Omit<Transaction, 'id' | 'createdAt' | 'userId'>[] = reviewDeposits.map(item => ({
            type: 'Deposit',
            description: item.description,
            amount: item.amount,
            date: Timestamp.fromDate(item.date),
            toAccountId: item.accountId,
        }));

        try {
            if (expensesToCreate.length > 0) {
                await addBulkExpenses(user.uid, expensesToCreate);
            }
            if (depositsToCreate.length > 0) {
                await addBulkTransactions(user.uid, depositsToCreate);
            }
            
            gtagEvent({ action: 'import_csv', category: 'Expense', label: 'CSV Import Success', value: expensesToCreate.length + depositsToCreate.length });
            toast({ title: 'Import Successful!', description: `${expensesToCreate.length} expenses and ${depositsToCreate.length} deposits have been imported.` });
            
            localStorage.removeItem('csv_data');
            localStorage.removeItem('csv_headers');
            localStorage.removeItem('csv_mappings');
            localStorage.removeItem('csv_statement_type');
            localStorage.removeItem('csv_account_id');

            router.push('/expenses');
        } catch (error) {
            console.error(error);
            gtagEvent({ action: 'import_csv_error', category: 'Expense', label: 'CSV Import Failed' });
            toast({ variant: 'destructive', title: 'Import Failed', description: 'An error occurred during the import process.' });
            setIsImporting(false);
        }
    };
    
    if (loading) {
        return (
            <AppShell>
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Analyzing your data and suggesting categories...</p>
                    <Progress value={progress} className="w-1/2" />
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
             <div className="flex flex-col gap-8">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Import Transactions - Step 3 of 3</h1>
                    <p className="text-muted-foreground">Review, categorize, and import your transactions.</p>
                </header>
                
                <Tabs defaultValue="expenses">
                    <TabsList>
                        <TabsTrigger value="expenses">Expenses ({reviewItems.length})</TabsTrigger>
                        <TabsTrigger value="deposits">Deposits ({reviewDeposits.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="expenses">
                         <Card>
                            <CardHeader>
                                <CardTitle>Review Expenses</CardTitle>
                                <CardDescription>
                                    We've suggested categories for your expenses. Please review them and select a category for any unassigned items before importing.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead className="w-1/4">Category</TableHead>
                                                <TableHead className="w-[50px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reviewItems.length > 0 ? reviewItems.map((item, index) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.date.toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={item.description}
                                                            onChange={(e) => handleExpenseDescriptionChange(index, e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-red-500 font-mono">- {item.amount.toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={item.categoryId}
                                                            onValueChange={(value) => handleCategoryChange(index, value)}
                                                        >
                                                            <SelectTrigger className={cn(item.error && "border-destructive ring-destructive")}>
                                                                <SelectValue placeholder="Select a category..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {categories.map(c => (
                                                                    <SelectItem key={c.id} value={c.id}>
                                                                        <div className="flex items-center gap-2">
                                                                            <Icon name={c.icon || 'Package'} className="h-4 w-4" />
                                                                            <span>{c.name}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteExpense(item.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={5} className="text-center h-24">No expenses to import.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="deposits">
                        <Card>
                            <CardHeader>
                                <CardTitle>Review Deposits</CardTitle>
                                <CardDescription>These are the positive values from your file that will be imported as deposit transactions.</CardDescription>
                            </CardHeader>
                            <CardContent>
                               <div className="overflow-x-auto border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Account</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead className="w-[50px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                             {reviewDeposits.length > 0 ? reviewDeposits.map((item, index) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.date.toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={item.description}
                                                            onChange={(e) => handleDepositDescriptionChange(index, e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </TableCell>
                                                    <TableCell>{accounts.find(a => a.id === item.accountId)?.name}</TableCell>
                                                    <TableCell className="text-right text-green-500 font-mono">+ {item.amount.toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteDeposit(item.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={5} className="text-center h-24">No deposits to import.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>


                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => router.push('/import/map')} disabled={isImporting}>Back</Button>
                    <Button onClick={handleFinishImport} disabled={isImporting}>
                        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4"/>}
                        {isImporting ? 'Importing...' : 'Finish Import'}
                    </Button>
                </div>
            </div>
        </AppShell>
    );
}
