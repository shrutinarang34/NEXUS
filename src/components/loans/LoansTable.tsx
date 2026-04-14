
"use client";

import { useState, useEffect } from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, User, PlusCircle } from "lucide-react";
import type { Person, Account, LoanTransaction, UserSettings } from "@/types";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { deletePerson, getUserSettings } from "@/lib/loans";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoanTransactionForm } from "./LoanTransactionForm";
import Link from "next/link";
import { gtagEvent } from "@/lib/analytics";

interface LoansTableProps {
  data: Person[];
  accounts: Account[];
  transactions: LoanTransaction[];
  onDataChange: () => void;
  persons: Person[];
}

export function LoansTable({ data, accounts, transactions, onDataChange, persons }: LoansTableProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isTxFormOpen, setIsTxFormOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  useEffect(() => {
    if (user) {
        getUserSettings(user.uid).then(setSettings);
    }
  }, [user]);

  const onFormSubmit = () => {
    onDataChange();
    setIsTxFormOpen(false);
    setSelectedPerson(null);
  };
  
  const openTransactionForm = (person: Person) => {
    setSelectedPerson(person);
    setIsTxFormOpen(true);
  }
  
  const handleDelete = async (personId: string) => {
    if (!user) return;
    try {
      await deletePerson(user.uid, personId);
      toast({ description: "Person record deleted successfully." });
      gtagEvent({ action: 'delete_person', category: 'Loan', label: personId });
      onDataChange();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: (error as Error).message || "Failed to delete person record." });
      gtagEvent({ action: 'loan_error', category: 'Error', label: 'Delete Person Failed' });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: settings?.currency || 'USD' 
    }).format(val);
  }

  const columns: ColumnDef<Person>[] = [
    {
      accessorKey: "name",
      header: "Person",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
                <AvatarImage src={row.original.avatarUrl} alt={row.original.name}/>
                <AvatarFallback><User/></AvatarFallback>
            </Avatar>
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "currentBalance",
      header: ({ column }) => (
        <div className="text-right">
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Current Balance <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const balance = row.original.currentBalance;
        if (balance === 0) {
            return <div className="text-right text-muted-foreground">—</div>;
        }
        const balanceColor = balance > 0 ? "text-green-600" : "text-red-600";
        return (
          <div className={`text-right font-mono font-semibold ${balanceColor}`}>
            {formatCurrency(Math.abs(balance))}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Created At
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>{format(row.original.createdAt.toDate(), "PPP")}</div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
          const balance = row.original.currentBalance;
          const statusText = balance > 0 ? 'Owed to you' : balance < 0 ? 'You owe' : 'Settled Up';
          if (balance === 0) {
              return <Badge variant="secondary">Settled Up</Badge>
          }
          return (
            <Badge variant={balance > 0 ? 'default' : 'destructive'}>
                {statusText}
            </Badge>
          )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const person = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => openTransactionForm(person)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Transaction
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/loans/${person.id}`}>View Details</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
        <div className="rounded-md border overflow-x-auto">
            <Table>
            <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                    ))}
                </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                    No loans found.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
        
        <LoanTransactionForm
            isOpen={isTxFormOpen}
            onOpenChange={setIsTxFormOpen}
            person={selectedPerson}
            accounts={accounts}
            onFormSubmit={onFormSubmit}
            persons={persons}
            isCreatingNewPerson={false}
            setIsCreatingNewPerson={() => {}}
        />
    </>
  );
}
