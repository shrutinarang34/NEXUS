
"use client";

import * as React from "react";
import { PlusCircle, UserPlus, HandCoins, CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Person, Account, LoanTransaction, UserSettings } from "@/types";
import { LoansTable } from "./LoansTable";
import { LoanTransactionForm } from "./LoanTransactionForm";

interface LoanManagerProps {
    persons: Person[];
    accounts: Account[];
    transactions: LoanTransaction[];
    onDataChange: () => void;
    settings: UserSettings | null;
}

export function LoanManager({ persons, accounts, transactions, onDataChange, settings }: LoanManagerProps) {
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [selectedPerson, setSelectedPerson] = React.useState<Person | null>(null);
    const [isCreatingNewPerson, setIsCreatingNewPerson] = React.useState(false);

    const receivables = React.useMemo(() => persons.filter(p => p.currentBalance > 0), [persons]);
    const payables = React.useMemo(() => persons.filter(p => p.currentBalance < 0), [persons]);

    const totalReceivables = React.useMemo(() => receivables.reduce((sum, d) => sum + d.currentBalance, 0), [receivables]);
    const totalPayables = React.useMemo(() => payables.reduce((sum, d) => sum + Math.abs(d.currentBalance), 0), [payables]);

    const onFormSubmit = () => {
        onDataChange();
        setIsFormOpen(false);
        setSelectedPerson(null);
        setIsCreatingNewPerson(false);
    }
    
    const handleOpenForm = (person: Person | null, isNew: boolean) => {
        setSelectedPerson(person);
        setIsCreatingNewPerson(isNew);
        setIsFormOpen(true);
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: settings?.currency || 'USD' 
        }).format(val);
    }

    return (
        <>
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Loans</h1>
                    <p className="text-muted-foreground">Track money you&apos;ve lent or borrowed.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleOpenForm(null, false)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> New Transaction
                    </Button>
                    <Button onClick={() => handleOpenForm(null, true)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Add Person
                    </Button>
                </div>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Money Owed to You (Receivables)</CardTitle>
                        <HandCoins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalReceivables)}</div>
                        <p className="text-xs text-muted-foreground">From {receivables.length} people</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Money You Owe (Payables)</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(totalPayables)}</div>
                         <p className="text-xs text-muted-foreground">To {payables.length} people</p>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Loan Balances</CardTitle>
                    <CardDescription>A summary of all your receivables and payables.</CardDescription>
                </CardHeader>
                <CardContent>
                    <LoansTable 
                        data={persons}
                        accounts={accounts}
                        transactions={transactions}
                        onDataChange={onDataChange}
                        persons={persons}
                    />
                </CardContent>
            </Card>

            <LoanTransactionForm
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                accounts={accounts}
                persons={persons}
                onFormSubmit={onFormSubmit}
                person={selectedPerson}
                isCreatingNewPerson={isCreatingNewPerson}
                setIsCreatingNewPerson={setIsCreatingNewPerson}
            />
        </>
    );
}
