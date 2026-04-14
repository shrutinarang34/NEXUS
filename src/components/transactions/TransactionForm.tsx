

"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { addTransaction } from "@/lib/firestore";
import type { Account } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";
import { Icon } from "../Icon";
import { Textarea } from "../ui/textarea";
import { CurrencyInput } from "../ui/currency-input";
import { gtagEvent } from "@/lib/analytics";

const transactionSchema = z.object({
    type: z.enum(["Deposit", "Withdrawal", "Transfer"]),
    amount: z.coerce.number().positive("Amount must be positive"),
    date: z.date({ required_error: "Date is required" }),
    fromAccountId: z.string().optional(),
    toAccountId: z.string().optional(),
    description: z.string().min(1, "Description is required"),
}).refine(data => {
    if (data.type === "Deposit") return !!data.toAccountId;
    if (data.type === "Withdrawal") return !!data.fromAccountId;
    if (data.type === "Transfer") return !!data.fromAccountId && !!data.toAccountId && data.fromAccountId !== data.toAccountId;
    return true;
}, {
    message: "Please select the correct accounts for the transaction type.",
    path: ["fromAccountId"], // Show error on one of the fields
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  onFormSubmit: () => void;
}

export function TransactionForm({
  isOpen,
  onOpenChange,
  accounts,
  onFormSubmit,
}: TransactionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
        type: "Deposit",
        amount: 0,
        date: new Date(),
        description: "",
    },
  });

  const transactionType = form.watch("type");

  const onSubmit = async (values: TransactionFormValues) => {
    if (!user) return;
    try {
      const dataToSave = {
        ...values,
        date: Timestamp.fromDate(values.date),
        userId: user.uid,
      };

      await addTransaction(user.uid, dataToSave);
      toast({ title: "Success", description: "Transaction recorded successfully." });
      gtagEvent({ action: 'add_transaction', category: 'Transaction', label: values.type, value: values.amount });
      
      onFormSubmit();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save transaction.",
      });
      gtagEvent({ action: 'transaction_error', category: 'Error', label: 'Save Transaction Failed' });
    }
  };
  
  React.useEffect(() => {
    if (!isOpen) {
      form.reset({
        type: "Deposit",
        amount: 0,
        date: new Date(),
        description: "",
        fromAccountId: undefined,
        toAccountId: undefined,
      });
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">Add Transaction</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a transaction type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Deposit">Deposit</SelectItem>
                      <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal",!field.value && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {(transactionType === "Withdrawal" || transactionType === "Transfer") && (
                <FormField
                control={form.control}
                name="fromAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Account</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                             <div className="flex items-center gap-2">
                                <Icon name={acc.icon || 'Landmark'} />
                                <span>{acc.name}</span>
                             </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(transactionType === "Deposit" || transactionType === "Transfer") && (
                 <FormField
                 control={form.control}
                 name="toAccountId"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>To Account</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                       <FormControl>
                         <SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger>
                       </FormControl>
                       <SelectContent>
                         {accounts.map((acc) => (
                           <SelectItem key={acc.id} value={acc.id}>
                              <div className="flex items-center gap-2">
                                 <Icon name={acc.icon || 'Landmark'} />
                                 <span>{acc.name}</span>
                              </div>
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     <FormMessage />
                   </FormItem>
                 )}
               />
            )}
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Paycheck, ATM Withdrawal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </DialogClose>
              <Button type="submit">Add Transaction</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
