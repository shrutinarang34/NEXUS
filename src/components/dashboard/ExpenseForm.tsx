

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { addExpense, getExpenses, getUserSettings, updateExpense } from "@/lib/firestore";
import type { Expense, Category, Account, UserSettings } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";
import { Icon } from "../Icon";
import { CurrencyInput } from "../ui/currency-input";
import { CategoryDialog } from "../settings/CategoryDialog";
import { suggestCategory } from "@/ai/flows/suggest-category-flow";
import { useDebounce } from "@/hooks/use-debounce";
import { gtagEvent } from "@/lib/analytics";

const expenseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.date({ required_error: "Date is required" }),
  categoryId: z.string().min(1, "Category is required"),
  accountId: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
  categories: Category[];
  accounts: Account[];
  onFormSubmit: () => void;
}

export function ExpenseForm({
  isOpen,
  onOpenChange,
  expense,
  categories,
  accounts,
  onFormSubmit,
}: ExpenseFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [allExpenses, setAllExpenses] = React.useState<Expense[]>([]);
  const [suggestions, setSuggestions] = React.useState<Expense[]>([]);
  const [settings, setSettings] = React.useState<UserSettings | null>(null);
  const [isSuggestingCategory, setIsSuggestingCategory] = React.useState(false);
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (user && isOpen) {
      getExpenses(user.uid).then(setAllExpenses);
      getUserSettings(user.uid).then(setSettings);
    }
  }, [user, isOpen]);
  
  const defaultAccount = accounts.find(a => a.isDefault);

  const defaultValues = React.useMemo(() => (
    expense 
      ? { ...expense, date: expense.date.toDate() } 
      : {
          name: "",
          amount: 0,
          date: new Date(),
          categoryId: "",
          accountId: defaultAccount?.id || "",
        }
  ), [expense, defaultAccount]);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues,
  });
  
  const { reset, watch, setValue, trigger } = form;
  const nameValue = watch('name');
  const debouncedNameValue = useDebounce(nameValue, 500);

  const featureFlags = settings?.featureFlags || { loans: false, budgets: false, transactions: true, aiInsights: false };

  React.useEffect(() => {
    const getCategorySuggestion = async () => {
        if (featureFlags.aiInsights && debouncedNameValue && categories.length > 0) {
            setIsSuggestingCategory(true);
            try {
                const result = await suggestCategory({
                    expenseName: debouncedNameValue,
                    categories: categories,
                });
                if (result.categoryId && categories.some(c => c.id === result.categoryId)) {
                    setValue('categoryId', result.categoryId, { shouldValidate: true });
                    gtagEvent({ action: "suggest_category_success", category: "AI", label: debouncedNameValue });
                }
            } catch (error) {
                console.error("Failed to suggest category:", error);
                gtagEvent({ action: "suggest_category_error", category: "AI", label: (error as Error).message });
            } finally {
                setIsSuggestingCategory(false);
            }
        }
    };
    getCategorySuggestion();
  }, [debouncedNameValue, categories, setValue, featureFlags.aiInsights]);


  React.useEffect(() => {
    if (nameValue && allExpenses.length > 0) {
      const lowercasedName = nameValue.toLowerCase();
      // Get unique expenses by name, sorted by most recent date
      const uniqueExpenses = Array.from(new Map(allExpenses
        .sort((a,b) => b.date.toMillis() - a.date.toMillis())
        .map(e => [e.name, e])).values());

      const filtered = uniqueExpenses
        .filter(e => e.name.toLowerCase().includes(lowercasedName) && e.name.toLowerCase() !== lowercasedName)
        .slice(0, 5); // Limit suggestions
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [nameValue, allExpenses]);

  const handleSuggestionClick = (suggestion: Expense) => {
    setValue('name', suggestion.name);
    // Do not pre-fill amount
    setValue('categoryId', suggestion.categoryId);
    if(suggestion.accountId) setValue('accountId', suggestion.accountId);
    setSuggestions([]);
    trigger('categoryId');
    // Timeout to allow state to update before focusing
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 0);
  };

  React.useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
    } else {
      setSuggestions([]);
    }
  }, [isOpen, defaultValues, reset]);

  const onSubmit = async (values: ExpenseFormValues) => {
    if (!user) return;
    try {
      const dataToSave = {
        ...values,
        date: Timestamp.fromDate(values.date),
        userId: user.uid,
      };

      if (expense?.id) {
        await updateExpense(user.uid, expense.id, dataToSave);
        toast({ title: "Success", description: "Expense updated successfully." });
        gtagEvent({ action: 'update_expense', category: 'Expense', label: values.name, value: values.amount });
      } else {
        await addExpense(user.uid, dataToSave);
        toast({ title: "Success", description: "Expense added successfully." });
        gtagEvent({ action: 'add_expense', category: 'Expense', label: values.name, value: values.amount });
      }
      onFormSubmit();
      onOpenChange(false); // Close dialog on submit
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save expense.",
      });
      gtagEvent({ action: 'expense_error', category: 'Error', label: 'Save Expense Failed' });
    }
  };

  const handleCategoryAdded = () => {
    onFormSubmit(); 
    setIsCategoryDialogOpen(false);
  }
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline">{expense ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="e.g., Coffee" 
                          {...field} 
                          ref={nameInputRef}
                          autoComplete="off"
                        />
                        {suggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
                            <ul className="py-1">
                              {suggestions.map((s) => (
                                <li 
                                  key={s.id} 
                                  className="px-3 py-2 cursor-pointer hover:bg-accent"
                                  // Use onMouseDown to prevent the input from blurring before the click is registered
                                  onMouseDown={() => handleSuggestionClick(s)}
                                >
                                  {s.name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </FormControl>
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
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                           <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <div className={cn(featureFlags.aiInsights && "ai-glass-card p-4 rounded-lg")}>
                    <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                    <FormItem>
                        <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                             <FormLabel>Category</FormLabel>
                             {isSuggestingCategory && <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />}
                        </div>
                        <Button variant="link" type="button" className="h-auto p-0 text-xs" onClick={() => setIsCategoryDialogOpen(true)}>
                            <PlusCircle className="mr-1 h-3 w-3"/>
                            Add New
                        </Button>
                        </div>
                        <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        >
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                                <div className="flex items-center gap-2">
                                <Icon name={cat.icon || 'Smile'} />
                                <span>{cat.name}</span>
                                </div>
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        {featureFlags.aiInsights && (
                            <small className="text-xs text-muted-foreground mt-1">AI-powered suggestions may not always be perfect. Please verify the category.</small>
                        )}
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
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
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">
                  {expense ? "Save Changes" : "Add Expense"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <CategoryDialog
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onCategoryAdded={handleCategoryAdded}
      />
    </>
  );
}
