

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
  DialogTrigger,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { addRecurringItem, updateRecurringItem } from "@/lib/firestore";
import type { RecurringItem, Category, Account } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";
import { Icon } from "../Icon";
import { CurrencyInput } from "../ui/currency-input";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { gtagEvent } from "@/lib/analytics";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["expense", "transaction"]),
  transactionType: z.enum(["Deposit", "Withdrawal"]).optional(),
  amount: z.coerce.number().positive("Amount must be positive"),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "yearly"]),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().min(1, "Account is required"),
}).refine(data => data.type === 'expense' ? !!data.categoryId : true, {
    message: "Category is required for expenses.",
    path: ["categoryId"],
}).refine(data => data.type === 'transaction' ? !!data.transactionType : true, {
    message: "Transaction type is required.",
    path: ["transactionType"],
});

type FormValues = z.infer<typeof formSchema>;

interface RecurringItemFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item?: RecurringItem | null;
  categories: Category[];
  accounts: Account[];
  onFormSubmit: () => void;
}

export function RecurringItemForm({
  isOpen,
  onOpenChange,
  item,
  categories,
  accounts,
  onFormSubmit,
}: RecurringItemFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const defaultValues = React.useMemo(() => (
    item 
      ? { ...item, startDate: item.startDate.toDate(), endDate: item.endDate?.toDate() } 
      : {
          name: "",
          type: 'expense' as const,
          amount: 0,
          frequency: 'monthly' as const,
          startDate: new Date(),
          isActive: true,
        }
  ), [item]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  const { reset, watch } = form;
  const itemType = watch('type');

  React.useEffect(() => {
    if (isOpen) {
      reset(defaultValues as any);
    }
  }, [isOpen, defaultValues, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    try {
      const dataToSave: any = {
        ...values,
        startDate: Timestamp.fromDate(values.startDate),
        isActive: item?.isActive ?? true,
        // Set nextDueDate to startDate if it's a new item
        nextDueDate: item?.nextDueDate ? item.nextDueDate : Timestamp.fromDate(values.startDate),
      };
      
      if (values.endDate) {
        dataToSave.endDate = Timestamp.fromDate(values.endDate);
      } else {
        // Firestore doesn't support `undefined`, so we ensure the field is removed if it's not set
        dataToSave.endDate = null;
      }

      if (item?.id) {
        await updateRecurringItem(user.uid, item.id, dataToSave);
        toast({ title: "Success", description: "Recurring item updated." });
        gtagEvent({ action: 'update_recurring_item', category: 'Recurring', label: values.name });
      } else {
        await addRecurringItem(user.uid, dataToSave as any);
        toast({ title: "Success", description: "Recurring item created." });
        gtagEvent({ action: 'add_recurring_item', category: 'Recurring', label: values.name, value: values.amount });
      }
      onFormSubmit();
    } catch (error) {
        console.error(error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save item.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline">{item ? "Edit Recurring Item" : "Create Recurring Item"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
            <FormField
                control={form.control} name="type"
                render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Item Type</FormLabel>
                    <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="expense" /></FormControl><FormLabel className="font-normal">Expense</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="transaction" /></FormControl><FormLabel className="font-normal">Transaction</FormLabel></FormItem>
                    </RadioGroup>
                    </FormControl>
                </FormItem>
                )}
            />

            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name / Description</FormLabel><FormControl><Input placeholder="e.g., Netflix, Salary" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>

            <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount</FormLabel><FormControl><CurrencyInput value={field.value} onChange={field.onChange}/></FormControl><FormMessage /></FormItem>
            )}/>

            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="frequency" render={({ field }) => (
                    <FormItem><FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Biweekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )}/>
                {itemType === 'transaction' && (
                    <FormField control={form.control} name="transactionType" render={({ field }) => (
                        <FormItem><FormLabel>Transaction Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select type..."/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Deposit">Deposit</SelectItem>
                                <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                            </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )}/>
                )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Start Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button variant={"outline"} className={cn("justify-start text-left font-normal w-full", !field.value && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                    <FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>End Date (Optional)</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("justify-start text-left font-normal w-full", !field.value && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                            </PopoverContent>
                        </Popover>
                    <FormMessage /></FormItem>
                )}/>
            </div>
            
            <FormField control={form.control} name="accountId" render={({ field }) => (
                <FormItem><FormLabel>Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger></FormControl>
                    <SelectContent>{accounts.map((acc) => (<SelectItem key={acc.id} value={acc.id}><div className="flex items-center gap-2"><Icon name={acc.icon || 'Landmark'} /><span>{acc.name}</span></div></SelectItem>))}</SelectContent>
                    </Select><FormMessage /></FormItem>
            )}/>
            
            {itemType === 'expense' && (
                <FormField control={form.control} name="categoryId" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>{categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}><div className="flex items-center gap-2"><Icon name={cat.icon || 'Smile'} /><span>{cat.name}</span></div></SelectItem>))}</SelectContent>
                        </Select><FormMessage /></FormItem>
                )}/>
            )}

            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
              <Button type="submit">{item ? "Save Changes" : "Create Item"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
