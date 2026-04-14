

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
import { Pencil, Trash2, ArrowUpDown } from "lucide-react";
import type { Expense, Category, Account, UserSettings } from "@/types";
import { ExpenseForm } from "./ExpenseForm";
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
import { useAuth } from "@/lib/auth";
import { deleteExpense, getUserSettings } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DataTablePagination } from "./DataTablePagination";
import { gtagEvent } from "@/lib/analytics";
import { Badge } from "../ui/badge";


interface ExpensesDataTableProps {
  data: Expense[];
  categories: Category[];
  accounts: Account[];
  onDataChanged: () => void;
}

export function ExpensesDataTable({
  data,
  categories,
  accounts,
  onDataChanged,
}: ExpensesDataTableProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);

  useEffect(() => {
    if(user) {
        getUserSettings(user.uid).then(setSettings);
    }
  }, [user]);

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsFormOpen(true);
  };

  const handleDelete = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!user || !selectedExpense) return;
    try {
      await deleteExpense(user.uid, selectedExpense.id);
      toast({ title: "Success", description: "Expense deleted." });
      gtagEvent({ action: 'delete_expense', category: 'Expense', label: selectedExpense.name, value: selectedExpense.amount });
      onDataChanged();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete expense.",
      });
      gtagEvent({ action: 'expense_error', category: 'Error', label: 'Delete Expense Failed' });
    } finally {
      setIsAlertOpen(false);
      setSelectedExpense(undefined);
    }
  };

  const onFormSubmit = () => {
    onDataChanged();
    setIsFormOpen(false);
    setSelectedExpense(undefined);
  }

  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <span className="font-medium">{row.getValue("name")}</span>
            {row.original.isImported && <Badge variant="outline">Imported</Badge>}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount"));
        return <div className="text-right font-mono">{new Intl.NumberFormat("en-US", { style: "currency", currency: settings?.currency || 'USD' }).format(amount)}</div>;
      },
    },
    {
      accessorKey: "date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <div>{format(row.original.date.toDate(), "PPP")}</div>,
    },
    {
      accessorKey: "categoryId",
      header: "Category",
      cell: ({ row }) => categories.find((c) => c.id === row.getValue("categoryId"))?.name || "N/A",
    },
    {
      accessorKey: "accountId",
      header: "Account",
      cell: ({ row }) => accounts.find((a) => a.id === row.getValue("accountId"))?.name || "N/A",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const expense = row.original;
        return (
          <div className="text-right">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(expense)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
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


  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
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

      <ExpenseForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        expense={selectedExpense}
        categories={categories}
        accounts={accounts}
        onFormSubmit={onFormSubmit}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              expense.
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
