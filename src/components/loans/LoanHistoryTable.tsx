
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
import { ArrowUpDown, Trash2 } from "lucide-react";
import type { LoanTransaction, Account, UserSettings } from "@/types";
import { format } from "date-fns";
import { DataTablePagination } from "@/components/dashboard/DataTablePagination";
import { Badge } from "../ui/badge";
import { useAuth } from "@/lib/auth";
import { getUserSettings, deleteLoanTransaction } from "@/lib/loans";
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
} from "@/components/ui/alert-dialog";

interface LoanHistoryTableProps {
  transactions: LoanTransaction[];
  accounts: Account[];
  onDataChanged: () => void;
}

export function LoanHistoryTable({ transactions, accounts, onDataChanged }: LoanHistoryTableProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [itemToDelete, setItemToDelete] = useState<LoanTransaction | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if(user) {
        getUserSettings(user.uid).then(setSettings);
    }
  }, [user]);

  const getAccountName = (accountId: string) => accounts.find(a => a.id === accountId)?.name || 'N/A';

  const formatCurrency = (val: number, currencyCode?: string) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currencyCode || settings?.currency || 'USD' 
    }).format(val);
  }

  const handleDelete = async () => {
    if (!user || !itemToDelete) return;
    try {
      await deleteLoanTransaction(user.uid, itemToDelete.id);
      toast({ title: "Success", description: "Loan transaction deleted and balances reverted." });
      onDataChanged();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete transaction." });
    } finally {
      setItemToDelete(null);
    }
  };

  const getReversalInfo = () => {
    if (!itemToDelete) return { text: "" };
    
    const { type, amount, accountId, currency } = itemToDelete;
    const account = accounts.find(a => a.id === accountId);
    const amountText = formatCurrency(amount, currency);

    let text = "";
    if (type === 'lent' || type === 'repayment_made') {
        text = `This will add ${amountText} back to your "${account?.name}" account and update the loan balance.`;
    } else { // borrowed or repayment_received
        text = `This will subtract ${amountText} from your "${account?.name}" account and update the loan balance.`;
    }
    return { text };
  }

  const columns: ColumnDef<LoanTransaction>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Date <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => format(row.original.date.toDate(), "PPP"),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.type;
        const formattedType = type.replace('_', ' ');
        const isPositive = type === 'borrowed' || type === 'repayment_received';
        return <Badge variant={isPositive ? 'default' : 'secondary'} className="capitalize">{formattedType}</Badge>;
      },
    },
    {
        accessorKey: 'amount',
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => {
            const { amount, currency } = row.original;
            return <div className="text-right font-mono">{formatCurrency(amount, currency)}</div>;
        },
    },
    {
      accessorKey: "accountId",
      header: "Account",
      cell: ({ row }) => getAccountName(row.original.accountId),
    },
    {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => <div className="truncate max-w-xs">{row.original.notes || '-'}</div>
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-right">
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete(item)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    }
  ];

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
     initialState: {
        pagination: {
            pageSize: 15,
        }
    }
  });

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-md border">
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
                    No transactions found for this person.
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
                        This will permanently delete this loan transaction and revert the changes to both the loan balance and your account balance.
                        <div className="mt-2 font-semibold text-foreground">{getReversalInfo().text}</div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
