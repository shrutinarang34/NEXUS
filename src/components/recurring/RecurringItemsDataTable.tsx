
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
import { Pencil, Trash2, ArrowUpDown } from "lucide-react";
import type { RecurringItem, Category, Account, UserSettings } from "@/types";
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
import { deleteRecurringItem, updateRecurringItem, getUserSettings } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Switch } from "../ui/switch";
import { gtagEvent } from "@/lib/analytics";

interface RecurringItemsDataTableProps {
  data: RecurringItem[];
  categories: Category[];
  accounts: Account[];
  onDataChanged: () => void;
  onEdit: (item: RecurringItem) => void;
}

export function RecurringItemsDataTable({
  data,
  categories,
  accounts,
  onDataChanged,
  onEdit,
}: RecurringItemsDataTableProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [itemToDelete, setItemToDelete] = useState<RecurringItem | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);

  useEffect(() => {
    if(user) {
        getUserSettings(user.uid).then(setSettings);
    }
  }, [user]);

  const handleDelete = async () => {
    if (!user || !itemToDelete) return;
    try {
      await deleteRecurringItem(user.uid, itemToDelete.id);
      toast({ title: "Success", description: "Recurring item deleted." });
      gtagEvent({ action: 'delete_recurring_item', category: 'Recurring', label: itemToDelete.name });
      onDataChanged();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete item.",
      });
    } finally {
      setItemToDelete(null);
    }
  };
  
  const handleToggleActive = async (item: RecurringItem) => {
    if (!user) return;
    try {
        await updateRecurringItem(user.uid, item.id, { isActive: !item.isActive });
        toast({ description: `Item has been ${!item.isActive ? 'activated' : 'deactivated'}.` });
        gtagEvent({ action: 'toggle_recurring_item', category: 'Recurring', label: item.name, value: !item.isActive ? 1 : 0 });
        onDataChanged();
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to update item status." });
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: settings?.currency || 'USD' 
    }).format(val);
  }


  const columns: ColumnDef<RecurringItem>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => <Badge variant={row.original.type === 'expense' ? 'secondary' : 'default'} className="capitalize">{row.original.transactionType || row.original.type}</Badge>
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount"));
        return <div className="text-right font-mono">{formatCurrency(amount)}</div>;
      },
    },
    {
        accessorKey: "frequency",
        header: "Frequency",
        cell: ({ row }) => <div className="capitalize">{row.getValue("frequency")}</div>,
    },
    {
      accessorKey: "nextDueDate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Next Due Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const nextDueDate = row.original.nextDueDate;
        return <div>{nextDueDate ? format(nextDueDate.toDate(), "PPP") : 'N/A'}</div>;
      }
    },
    {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => <Switch checked={row.original.isActive} onCheckedChange={() => handleToggleActive(row.original)} />
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-right">
            <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete(item)}>
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
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });


  return (
    <>
      <div className="rounded-md border">
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
                  No recurring items found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this recurring item.
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
