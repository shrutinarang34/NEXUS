
"use client";

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth';
import { getPerson, getLoanTransactionsForPerson } from '@/lib/loans';
import { getAccounts, getUserSettings } from '@/lib/firestore';
import type { Person, LoanTransaction, Account, UserSettings } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { notFound, useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoanHistoryTable } from '@/components/loans/LoanHistoryTable';
import { LoanTransactionForm } from '@/components/loans/LoanTransactionForm';
import { Badge } from '@/components/ui/badge';
import { getPersons } from '@/lib/loans';

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();
  const [person, setPerson] = useState<Person | null>(null);
  const [transactions, setTransactions] = useState<LoanTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchData = async () => {
    if (user) {
      setLoading(true);
      const [personData, transactionsData, accountsData, allPersonsData, userSettings] = await Promise.all([
        getPerson(user.uid, id),
        getLoanTransactionsForPerson(user.uid, id),
        getAccounts(user.uid),
        getPersons(user.uid),
        getUserSettings(user.uid)
      ]);
      
      if (!personData) {
        notFound();
      }
      
      setPerson(personData);
      setTransactions(transactionsData);
      setAccounts(accountsData);
      setPersons(allPersonsData);
      setSettings(userSettings);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, id]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: settings?.currency || 'USD' 
    }).format(val);
  }
  
  const onFormSubmit = () => {
    fetchData();
    setIsFormOpen(false);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-96" />
        </div>
      </AppShell>
    );
  }

  if (!person) {
    return notFound();
  }

  const balance = person.currentBalance || 0;
  const balanceColor = balance > 0 ? "text-green-600" : balance < 0 ? "text-red-600" : "text-muted-foreground";
  const balanceText = balance > 0 ? 'Owed to you' : balance < 0 ? 'You owe' : 'Settled up';


  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <header>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                     <Button variant="outline" size="icon" onClick={() => router.push('/loans')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={person.avatarUrl} />
                        <AvatarFallback><User /></AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight font-headline">{person.name}</h1>
                        <div className="text-muted-foreground mt-1 flex items-center gap-2">
                           {balance !== 0 ? (
                             <>
                                <span className={`font-mono font-semibold ${balanceColor}`}>{formatCurrency(Math.abs(balance))}</span>
                                <span className="text-xs">({balanceText})</span>
                             </>
                           ) : (
                                <Badge variant="secondary">Settled up</Badge>
                           )}
                        </div>
                    </div>
                </div>
                 <Button onClick={() => setIsFormOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> New Transaction
                </Button>
            </div>
        </header>
        
        <Card>
            <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>A complete log of all loans and repayments with {person.name}.</CardDescription>
            </CardHeader>
            <CardContent>
                <LoanHistoryTable 
                    transactions={transactions} 
                    accounts={accounts}
                    onDataChanged={fetchData}
                />
            </CardContent>
        </Card>

      </div>

      <LoanTransactionForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        accounts={accounts}
        persons={persons}
        onFormSubmit={onFormSubmit}
        person={person}
        isCreatingNewPerson={false}
        setIsCreatingNewPerson={() => {}}
      />
    </AppShell>
  );
}
