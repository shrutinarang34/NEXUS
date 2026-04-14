

"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, PlusCircle, Sparkles, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { addBudget, updateBudget, getExpenses, getUserSettings } from "@/lib/firestore";
import type { Budget, Category, Expense, UserSettings } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";
import { CurrencyInput } from "../ui/currency-input";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "../ui/date-range-picker";
import { Icon } from "../Icon";
import { gtagEvent } from "@/lib/analytics";
import { autoAllocateBudget } from "@/ai/flows/auto-allocate-budget-flow";
import { Spinner } from "../ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";


const budgetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number().positive("Total budget amount must be positive"),
  period: z.enum(["monthly", "yearly", "custom"]),
  startDate: z.date(),
  endDate: z.date(),
  allocations: z.array(z.object({
      categoryId: z.string().min(1, "Category is required"),
      amount: z.coerce.number().positive("Amount must be positive"),
  })),
}).refine(data => {
    // Only validate if there are allocations, to allow auto-allocation to work
    if (data.allocations.length > 0) {
        const allocatedSum = data.allocations.reduce((sum, alloc) => sum + (alloc.amount || 0), 0);
        return allocatedSum <= data.amount + 0.01; // Allow for small rounding differences
    }
    return true;
}, {
    message: "Total allocated amount cannot exceed the total budget.",
    path: ["amount"],
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

interface BudgetFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget;
  categories: Category[];
  onFormSubmit: () => void;
}

const serializeObjectForFlow = (obj: any): any => {
  if (obj instanceof Timestamp) {
    return obj.toDate().toISOString();
  }
   if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeObjectForFlow);
  }
  if (typeof obj === 'object' && obj !== null) {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if(obj.hasOwnProperty(key)) {
        newObj[key] = serializeObjectForFlow(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

export function BudgetForm({
  isOpen,
  onOpenChange,
  budget,
  categories,
  onFormSubmit,
}: BudgetFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allExpenses, setAllExpenses] = React.useState<Expense[]>([]);
  const [isAllocating, setIsAllocating] = React.useState(false);
  const [showAiAnimation, setShowAiAnimation] = React.useState(false);
  const [settings, setSettings] = React.useState<UserSettings | null>(null);


  React.useEffect(() => {
    if (user && isOpen) {
        getExpenses(user.uid).then(setAllExpenses);
        getUserSettings(user.uid).then(setSettings);
    }
  }, [user, isOpen]);


  const defaultValues = React.useMemo(() => (
    budget 
      ? { ...budget, startDate: budget.startDate.toDate(), endDate: budget.endDate.toDate() } 
      : {
          name: "",
          amount: 0,
          period: "monthly" as const,
          startDate: startOfMonth(new Date()),
          endDate: endOfMonth(new Date()),
          allocations: [],
        }
  ), [budget]);
  
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues,
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "allocations",
  });
  
  const { reset, watch, setValue, getValues } = form;
  const period = watch("period");

  React.useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
      setShowAiAnimation(false);
    }
  }, [isOpen, defaultValues, reset]);
  
  React.useEffect(() => {
    const now = new Date();
    if(period === 'monthly') {
        setValue('startDate', startOfMonth(now));
        setValue('endDate', endOfMonth(now));
    } else if (period === 'yearly') {
        setValue('startDate', startOfYear(now));
        setValue('endDate', endOfYear(now));
    }
  }, [period, setValue]);

  const onSubmit = async (values: BudgetFormValues) => {
    if (!user) return;
    try {
      const dataToSave = {
        ...values,
        startDate: Timestamp.fromDate(values.startDate),
        endDate: Timestamp.fromDate(values.endDate),
        userId: user.uid,
      };

      if (budget?.id) {
        await updateBudget(user.uid, budget.id, dataToSave);
        toast({ title: "Success", description: "Budget updated." });
        gtagEvent({ action: 'update_budget', category: 'Budget', label: values.name, value: values.amount });
      } else {
        await addBudget(user.uid, dataToSave);
        toast({ title: "Success", description: "Budget created." });
        gtagEvent({ action: 'add_budget', category: 'Budget', label: values.name, value: values.amount });
      }
      onFormSubmit();
      onOpenChange(false);
    } catch (error) {
        console.error(error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save budget.",
      });
      gtagEvent({ action: 'budget_error', category: 'Error', label: 'Save Budget Failed' });
    }
  };
  
  const handleDateRangeChange = (range: DateRange | undefined) => {
      if(range?.from) setValue('startDate', range.from);
      if(range?.to) setValue('endDate', range.to);
  }

  const handleAutoAllocate = async () => {
    gtagEvent({ action: 'auto_allocate_click', category: 'AI', label: 'Budget Auto-Allocate' });

    const minDaysRequired = parseInt(process.env.NEXT_PUBLIC_AI_BUDGET_ALLOCATION_MIN_DAYS || '90');

    const firstExpense = allExpenses.length > 0 
        ? allExpenses.reduce((earliest, current) => current.date.toMillis() < earliest.date.toMillis() ? current : earliest)
        : null;
    
    if (!firstExpense || differenceInDays(new Date(), firstExpense.date.toDate()) < minDaysRequired) {
        const requiredDate = firstExpense ? format(addDays(firstExpense.date.toDate(), minDaysRequired), 'PPP') : 'later';
        let periodText = `${minDaysRequired} days`;
        if (minDaysRequired >= 30) {
            const months = Math.round(minDaysRequired / 30);
            periodText = months > 1 ? `about ${months} months` : 'about a month';
        } else if (minDaysRequired === 1) {
            periodText = '1 day';
        }

        toast({
            variant: "destructive",
            title: "Not Enough Data",
            description: `We need at least ${periodText} of expense data to analyze your spending. Please try again after ${requiredDate}.`
        });
        return;
    }

    const totalAmount = getValues('amount');
    if (totalAmount <= 0) {
        toast({ variant: 'destructive', title: 'Amount Required', description: 'Please enter a total budget amount before auto-allocating.' });
        return;
    }

    setIsAllocating(true);
    setShowAiAnimation(false);
    try {
        const expensesWithItemType = allExpenses.map(e => ({ ...e, itemType: 'expense' as const }));

        const input = {
            totalAmount,
            expenses: serializeObjectForFlow(expensesWithItemType),
            categories: serializeObjectForFlow(categories)
        };
        const result = await autoAllocateBudget(input);
        
        if (result.allocations) {
            replace(result.allocations); // Replace existing allocations
            toast({ title: "Success", description: "Budget categories have been allocated by AI." });
            setShowAiAnimation(true);
        }
    } catch (error) {
        console.error("Failed to auto-allocate budget:", error);
        toast({ variant: 'destructive', title: 'AI Allocation Failed', description: 'Could not generate allocations. Please try again.' });
    } finally {
        setIsAllocating(false);
    }
  };

  const remainingBudget = watch('amount') - watch('allocations').reduce((sum, a) => sum + (a.amount || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline">{budget ? "Edit Budget" : "Create Budget"}</DialogTitle>
          <DialogDescription>
            Budgets help you track your spending against a target for a specific period.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
            <FormField
              control={form.control} name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Name</FormLabel>
                  <FormControl><Input placeholder="e.g., June 2024 Budget" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control} name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Budget Amount</FormLabel>
                      <FormControl>
                        <CurrencyInput value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control} name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            {period === 'custom' && (
                <FormItem>
                    <FormLabel>Custom Date Range</FormLabel>
                    <DateRangePicker 
                        range={{from: watch('startDate'), to: watch('endDate')}}
                        onRangeChange={handleDateRangeChange}
                    />
                </FormItem>
            )}

            {settings?.featureFlags.aiInsights && (
              <div className="ai-glass-card p-4 space-y-2">
                  <Button type="button" className="w-full" onClick={handleAutoAllocate} disabled={isAllocating}>
                      {isAllocating ? <Spinner size="small" color="white" /> : <Sparkles className="mr-2 h-4 w-4"/>}
                      {isAllocating ? 'Allocating...' : 'Auto-Allocate with AI'}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">Based on your previous spending, we can automatically allocate your budget.</p>
              </div>
            )}


             <div className="space-y-2">
                 <div className="flex justify-between items-center pt-4">
                    <div>
                        <h3 className="font-medium">Category Allocations</h3>
                        <p className="text-sm text-muted-foreground">Unallocated: {new Intl.NumberFormat('en-us', {style: 'currency', currency: settings?.currency || 'USD'}).format(remainingBudget)}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => { setShowAiAnimation(false); append({ categoryId: "", amount: 0 }); }}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Category
                    </Button>
                 </div>
                
                {fields.map((field, index) => (
                    <div 
                      key={field.id} 
                      className={cn("flex items-end gap-2 p-2 border rounded-md", showAiAnimation && "animate-ai-flash-in")}
                      style={{ animationDelay: showAiAnimation ? `${index * 100}ms` : undefined }}
                    >
                        <FormField
                            control={form.control}
                            name={`allocations.${index}.categoryId`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel className="sr-only">Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Category..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`allocations.${index}.amount`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="sr-only">Amount</FormLabel>
                                    <FormControl>
                                        <CurrencyInput value={field.value} onChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </div>
                ))}
             </div>
            <DialogFooter className="sticky bottom-0 bg-background pt-4 -mb-4 pb-4 -mr-2 pr-2">
              <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
              <Button type="submit">{budget ? "Save Changes" : "Create Budget"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
