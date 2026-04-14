

"use client";

import { useState, useEffect } from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
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
import { ArrowUpDown, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Trash2 } from "lucide-react";
import type { LedgerItem, Category, Account, UserSettings } from "@/types";
import { format } from "date-fns";
import { Icon } from "../Icon";
import { DataTablePagination } from "../dashboard/DataTablePagination";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { deleteExpense, deleteTransaction, getUserSettings } from "@/lib/firestore";
import { gtagEvent } from "@/lib/analytics";
import { Badge } from "../ui/badge";

interface TransactionListProps {
  items: LedgerItem[];
  categories: Category[];
  accounts: Account[];
  onDataChanged: () => void;
}

export function TransactionList({
  items,
  categories,
  accounts,
  onDataChanged,
}: TransactionListProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [sorting, setSorting] = useState<SortingState>([
        { id: "date", desc: true },
    ]);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [itemToDelete, setItemToDelete] = useState<LedgerItem | null>(null);
    
    useEffect(() => {
        if(user) {
            getUserSettings(user.uid).then(setSettings);
        }
    }, [user]);

    const getAccountName = (accountId?: string) => accounts.find(a => a.id === accountId)?.name || 'N/A';
    
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: settings?.currency || 'USD' 
        }).format(val);
    }
    
    const handleDelete = (item: LedgerItem) => {
        setItemToDelete(item);
    };

    const confirmDelete = async () => {
        if (!user || !itemToDelete) return;

        try {
            if (itemToDelete.itemType === 'expense') {
                await deleteExpense(user.uid, itemToDelete.id);
                gtagEvent({ action: 'delete_expense', category: 'Expense', label: itemToDelete.name, value: itemToDelete.amount });
            } else {
                await deleteTransaction(user.uid, itemToDelete.id);
                 gtagEvent({ action: 'delete_transaction', category: 'Transaction', label: itemToDelete.type, value: itemToDelete.amount });
            }
            toast({ title: "Success", description: "Item deleted and balance reverted." });
            onDataChanged();
        } catch (error) {
            console.error("Deletion error:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete item." });
        } finally {
            setItemToDelete(null);
        }
    };
    
    const getReversalInfo = () => {
        if (!itemToDelete) return { text: '', amount: ''};

        if (itemToDelete.itemType === 'expense') {
            const account = accounts.find(a => a.id === itemToDelete.accountId);
            const amountText = formatCurrency(itemToDelete.amount);
            if (!account) return { text: "This will remove the expense record.", amount: amountText };
            return {
                text: `This will add ${amountText} back to your "${account.name}" account.`,
                amount: amountText
            };
        }
        
        // Handle Transactions
        const { type, amount, fromAccountId, toAccountId } = itemToDelete;
        const amountText = formatCurrency(amount);

        if (type === 'Deposit') {
            const account = accounts.find(a => a.id === toAccountId);
            if (!account) return { text: "This will remove the deposit record.", amount: amountText };
            return {
                text: `This will subtract ${amountText} from your "${account.name}" account.`,
                amount: amountText
            };
        }
        if (type === 'Withdrawal') {
            const account = accounts.find(a => a.id === fromAccountId);
            if (!account) return { text: "This will remove the withdrawal record.", amount: amountText };
            return {
                text: `This will add ${amountText} back to your "${account.name}" account.`,
                amount: amountText
            };
        }
        if (type === 'Transfer') {
            const fromAccount = accounts.find(a => a.id === fromAccountId);
            const toAccount = accounts.find(a => a.id === toAccountId);
            if (!fromAccount || !toAccount) return { text: "This will reverse the transfer.", amount: amountText };
            return {
                text: `This will add ${amountText} back to "${fromAccount.name}" and subtract it from "${toAccount.name}".`,
                amount: amountText
            };
        }
        return { text: 'This action cannot be undone.', amount: ''};
    }

    const columns: ColumnDef<LedgerItem>[] = [
        {
            id: "typeIcon",
            cell: ({ row }) => {
                const item = row.original;
                if (item.itemType === 'expense') return <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center"><ArrowUpRight className="h-4 w-4 text-red-500" /></div>;
                if (item.itemType === 'transaction' && item.type === 'Deposit') return <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center"><ArrowDownLeft className="h-4 w-4 text-green-500" /></div>;
                if (item.itemType === 'transaction' && item.type === 'Withdrawal') return <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center"><ArrowUpRight className="h-4 w-4 text-red-500" /></div>;
                if (item.itemType === 'transaction' && item.type === 'Transfer') return <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center"><ArrowRightLeft className="h-4 w-4 text-blue-500" /></div>;
                return null;
            },
            header: () => null,
            size: 50,
        },
        {
            id: "details",
            header: "Details",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div>
                        <div className="flex items-center gap-2">
                           <span className="font-medium">{item.itemType === 'expense' ? item.name : item.description}</span>
                           {item.itemType === 'expense' && item.isImported && <Badge variant="outline">Imported</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                        {item.itemType === 'expense' ? categories.find(c => c.id === item.categoryId)?.name || 'Uncategorized' : item.type}
                        </div>
                    </div>
                );
            }
        },
        {
            accessorKey: "amount",
            header: ({ column }) => (
                <div className="text-right">
                    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                        Amount
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            ),
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("amount"));
                 const item = row.original;
                 const sign = item.itemType === 'expense' || item.type === 'Withdrawal' ? '-' : '+';
                 const color = item.itemType === 'expense' || item.type === 'Withdrawal' ? 'text-red-500' : 'text-green-500';
                 if(item.type === 'Transfer') return <div className="text-right font-mono">{formatCurrency(amount)}</div>

                return <div className={`text-right font-mono ${color}`}>{sign}{formatCurrency(amount)}</div>;
            }
        },
        {
            accessorKey: "date",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div>{format(row.original.date.toDate(), "PPP")}</div>,
        },
        {
            id: "account",
            header: "Account",
            cell: ({ row }) => {
                const item = row.original;
                 if (item.itemType === 'expense') return getAccountName(item.accountId);
                if (item.itemType === 'transaction' && item.type === 'Deposit') return getAccountName(item.toAccountId);
                if (item.itemType === 'transaction' && item.type === 'Withdrawal') return getAccountName(item.fromAccountId);
                if (item.itemType === 'transaction' && item.type === 'Transfer') return (
                     <div className="flex items-center gap-2">
                      <Icon name={accounts.find(a=>a.id === item.fromAccountId)?.icon || 'Landmark'} size={16}/>
                      <span>&#8594;</span>
                      <Icon name={accounts.find(a=>a.id === item.toAccountId)?.icon || 'Landmark'} size={16}/>
                  </div>
                );
                return null;
            }
        },
        {
            id: 'actions',
            cell: ({ row }) => (
                <div className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(row.original)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
    ];

    const table = useReactTable({
        data: items,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
          sorting,
        },
        initialState: {
            pagination: {
                pageSize: 30,
            }
        }
    });

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground rounded-md border">
        No transactions or expenses found.
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>

    <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this item and revert the associated account balances.
                    <p className="mt-2 font-semibold text-foreground">{getReversalInfo().text}</p>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </>
  );
}

    
