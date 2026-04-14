
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlusCircle, Pencil, Trash2, ArrowLeft, Star, ArrowUpDown } from "lucide-react";
import type { Account, UserSettings } from "@/types";
import { useAuth } from "@/lib/auth";
import {
  addAccount,
  updateAccount,
  deleteAccount,
  setDefaultAccount,
  getUserSettings,
} from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { getIconForAccount } from "@/lib/icons";
import { Icon } from "@/components/Icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CurrencyInput } from "../ui/currency-input";
import { cn } from "@/lib/utils";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, SortingState } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { gtagEvent } from "@/lib/analytics";

const accountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["Bank Account", "Credit Account"], {
    required_error: "You need to select an account type.",
  }),
  balance: z.coerce.number().optional(),
  cashbackPercentage: z.coerce.number().min(0, "Cashback must be positive").optional(),
});
type AccountFormValues = z.infer<typeof accountSchema>;

interface AccountManagerProps {
  accounts: Account[];
  onAccountsChange: () => void;
}

export function AccountManager({ accounts, onAccountsChange }: AccountManagerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    if(user) {
        getUserSettings(user.uid).then(setSettings);
    }
  }, [user]);


  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
  });

  const accountType = form.watch("type");

  const openDialog = (account: Account | null = null) => {
    setEditingAccount(account);
    form.reset(
      account
        ? { name: account.name, type: account.type, balance: account.balance, cashbackPercentage: account.cashbackPercentage || 0 }
        : { name: "", type: "Bank Account", balance: 0, cashbackPercentage: 0 }
    );
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: AccountFormValues) => {
    if (!user) return;
    try {
      const icon = getIconForAccount(values.name, values.type);
      
      if (editingAccount) {
        const dataToUpdate = { ...values, icon };
        await updateAccount(user.uid, editingAccount.id, dataToUpdate);
        toast({ description: "Account updated." });
        gtagEvent({ action: 'update_account', category: 'Account', label: values.name });
      } else {
        const dataToSave = { ...values, icon, balance: values.balance || 0 };
        await addAccount(user.uid, dataToSave);
        toast({ description: "Account added." });
        gtagEvent({ action: 'add_account', category: 'Account', label: values.name });
      }
      onAccountsChange();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save account.",
      });
      gtagEvent({ action: 'account_error', category: 'Error', label: editingAccount ? 'Update Account Failed' : 'Add Account Failed' });
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!user) return;
    try {
      await deleteAccount(user.uid, accountId);
      toast({ description: "Account deleted." });
      gtagEvent({ action: 'delete_account', category: 'Account', label: accountId });
      onAccountsChange();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete account.",
      });
      gtagEvent({ action: 'account_error', category: 'Error', label: 'Delete Account Failed' });
    }
  };

  const handleSetDefault = async (accountId: string) => {
    if (!user) return;
    try {
      await setDefaultAccount(user.uid, accountId);
      toast({ description: "Default account updated." });
      gtagEvent({ action: 'set_default_account', category: 'Account', label: accountId });
      onAccountsChange();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to set default account.",
      });
      gtagEvent({ action: 'account_error', category: 'Error', label: 'Set Default Account Failed' });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: settings?.currency || 'USD' 
    }).format(val);
  }
  
  const columns: ColumnDef<Account>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Account Name <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="flex items-center gap-2 font-medium">
                <Icon name={row.original.icon || 'Landmark'} />
                {row.original.name}
                {row.original.isDefault && <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
            </div>
        )
    },
    {
        accessorKey: 'type',
        header: 'Type',
    },
    {
        accessorKey: 'balance',
        header: ({ column }) => (
            <div className="text-right">
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Balance <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            </div>
        ),
        cell: ({ row }) => (
            <div className="text-right font-mono">
                {formatCurrency(row.original.balance || 0)}
            </div>
        )
    },
    {
        accessorKey: 'cashbackPercentage',
        header: () => <div className="text-right">Cashback %</div>,
        cell: ({ row }) => (
            <div className="text-right">
                {row.original.cashbackPercentage ? `${row.original.cashbackPercentage}%` : 'N/A'}
            </div>
        )
    },
    {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="text-right flex justify-end gap-1">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => handleSetDefault(row.original.id)} disabled={row.original.isDefault}>
                        <Star className={cn("h-4 w-4", row.original.isDefault && "text-yellow-400 fill-yellow-400")} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Set as default</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => openDialog(row.original)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Edit</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span tabIndex={0}>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(row.original.id)} disabled={row.original.balance !== 0 || row.original.isDefault}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </span>
                </TooltipTrigger>
                {(row.original.balance !== 0 || row.original.isDefault) && (
                    <TooltipContent>
                        {row.original.isDefault ? <p>Cannot delete the default account.</p> : <p>Cannot delete an account with a non-zero balance.</p>}
                    </TooltipContent>
                )}
            </Tooltip>
          </div>
        )
    }
  ];

  const table = useReactTable({
      data: accounts,
      columns,
      state: { sorting },
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/settings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Accounts</h1>
            <p className="text-muted-foreground">Manage your payment accounts.</p>
          </div>
        </div>
        <Button onClick={() => openDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Account
        </Button>
      </header>
      <div className="border rounded-md">
      <TooltipProvider>
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
                  {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No accounts found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </TooltipProvider>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline">
              {editingAccount ? "Edit Account" : "Add Account"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Chase Bank, Visa Card" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Account Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Bank Account" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Bank Account
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Credit Account" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Credit Account
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {accountType === 'Credit Account' && (
                <FormField
                  control={form.control}
                  name="cashbackPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cashback % (optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 1.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {!editingAccount && (
                <FormField
                    control={form.control}
                    name="balance"
                    render={({ field: { onChange, value, ...rest } }) => (
                        <FormItem>
                          <FormLabel>Starting Balance</FormLabel>
                          <FormControl>
                              <CurrencyInput
                                value={value ?? 0}
                                onChange={onChange}
                                {...rest}
                              />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )}
                />
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">
                  {editingAccount ? "Save" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
