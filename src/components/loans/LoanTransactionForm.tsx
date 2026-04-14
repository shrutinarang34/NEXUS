

"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, UserPlus, Users, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { addLoanTransaction } from "@/lib/loans";
import type { Account, Person } from "@/types";
import { useToast } from "@/hooks/use-toast";
import * as md5 from 'md5';
import { CurrencyInput } from "../ui/currency-input";
import { Timestamp } from "firebase/firestore";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { gtagEvent } from "@/lib/analytics";

const transactionFormSchema = z.object({
  personId: z.string().min(1, "You must select or create a person."),
  personName: z.string().optional(),
  personEmail: z.string().email("Invalid email address").optional().or(z.literal('')),
  transactionType: z.enum(["lent", "borrowed", "repayment_received", "repayment_made"]),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.date({ required_error: "Date is required" }),
  accountId: z.string().min(1, "Account is required"),
  notes: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface LoanTransactionFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  persons: Person[];
  person: Person | null;
  onFormSubmit: () => void;
  isCreatingNewPerson: boolean;
  setIsCreatingNewPerson: (isNew: boolean) => void;
}

const transactionTypeDescriptions: Record<TransactionFormValues['transactionType'], string> = {
    lent: "Money leaves your selected account.",
    borrowed: "Money enters your selected account.",
    repayment_received: "Money enters your selected account.",
    repayment_made: "Money leaves your selected account."
};

export function LoanTransactionForm({ 
    isOpen, 
    onOpenChange, 
    accounts, 
    persons, 
    person, 
    onFormSubmit, 
    isCreatingNewPerson, 
    setIsCreatingNewPerson
}: LoanTransactionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  
  const bankAccounts = React.useMemo(() => accounts.filter(acc => acc.type === 'Bank Account'), [accounts]);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        personId: isCreatingNewPerson ? "new" : person?.id || "",
        personName: isCreatingNewPerson ? "" : person?.name || "",
        personEmail: isCreatingNewPerson ? "" : person?.email || "",
        transactionType: "lent",
        amount: 0,
        date: new Date(),
        accountId: "",
        notes: ""
      });
    }
  }, [isOpen, person, form, isCreatingNewPerson]);

  const onSubmit = async (values: TransactionFormValues) => {
    if (!user) return;
    
    try {
        if (isCreatingNewPerson) {
             if(!values.personName) {
                form.setError("personName", { message: "Person's name is required."});
                return;
             }
             const avatarUrl = values.personEmail 
                ? `https://www.gravatar.com/avatar/${md5(values.personEmail.trim().toLowerCase())}?d=identicon`
                : `https://www.gravatar.com/avatar/${md5(values.personName.trim().toLowerCase())}?d=identicon`;
             
             await addLoanTransaction(user.uid, {
                personId: null,
                personData: {
                    userId: user.uid,
                    name: values.personName,
                    email: values.personEmail,
                    avatarUrl,
                },
                transactionData: {
                    type: values.transactionType,
                    amount: values.amount,
                    date: Timestamp.fromDate(values.date),
                    accountId: values.accountId,
                    notes: values.notes,
                }
             });
             gtagEvent({ action: 'add_person', category: 'Loan', label: values.personName });
        } else {
             await addLoanTransaction(user.uid, {
                personId: values.personId,
                transactionData: {
                    type: values.transactionType,
                    amount: values.amount,
                    date: Timestamp.fromDate(values.date),
                    accountId: values.accountId,
                    notes: values.notes,
                }
             });
        }
      
      toast({ title: "Success", description: "Transaction recorded." });
      gtagEvent({ action: 'add_loan_transaction', category: 'Loan', label: values.transactionType, value: values.amount });
      onFormSubmit();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: (error as Error).message || "Failed to record transaction." });
       gtagEvent({ action: 'loan_error', category: 'Error', label: 'Save Loan Transaction Failed' });
    }
  };
  
  const selectedPerson = persons.find(p => p.id === form.watch('personId'));
  const transactionType = form.watch("transactionType");
  const personNameValue = form.watch("personName");


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{isCreatingNewPerson ? 'Add a New Person' : 'New Loan Transaction'}</DialogTitle>
          <DialogDescription>
            {isCreatingNewPerson ? 'Add a new person to track loans with and their initial transaction.' : 'Record a new loan, borrowing, or repayment.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">

            {isCreatingNewPerson ? (
                 <div className="space-y-2 p-4 border rounded-md bg-muted/50">
                    <h3 className="font-semibold text-sm">New Person Details</h3>
                    <FormField
                        control={form.control} name="personName"
                        render={({ field }) => (
                            <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                    />
                    <FormField
                        control={form.control} name="personEmail"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl><Input placeholder="john@example.com" {...field} /></FormControl>
                                <FormDescription className="text-xs">This email will be used to fetch the gravatar</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>
            ) : (
                <FormField
                    control={form.control} name="personId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Person</FormLabel>
                             <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant="outline" role="combobox" className="w-full justify-between">
                                    {selectedPerson ? selectedPerson.name : "Select person..."}
                                    <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search people..." />
                                    <CommandList>
                                        <CommandEmpty>No person found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem onSelect={() => {setIsCreatingNewPerson(true); field.onChange("new"); setPopoverOpen(false);}}>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Create New Person
                                            </CommandItem>
                                            {persons.map((p) => (
                                                <CommandItem value={p.name} key={p.id} onSelect={() => {field.onChange(p.id); setPopoverOpen(false)}}>
                                                    <Check className={cn("mr-2 h-4 w-4", p.id === field.value ? "opacity-100" : "opacity-0")} />
                                                    {p.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {isCreatingNewPerson ? (
                 <FormField
                    control={form.control}
                    name="transactionType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Initial Transaction</FormLabel>
                             <FormControl>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        variant={field.value === 'lent' ? 'default' : 'outline'}
                                        className="h-auto py-3 text-center"
                                        onClick={() => field.onChange('lent')}
                                    >
                                        <div>
                                            <span className="font-semibold">I Lent Money</span>
                                            <p className={cn("text-xs font-normal", field.value === 'lent' ? "text-primary-foreground/80" : "text-muted-foreground")}>{personNameValue || 'Someone'} owes me</p>
                                        </div>
                                    </Button>
                                     <Button
                                        type="button"
                                        variant={field.value === 'borrowed' ? 'default' : 'outline'}
                                        className="h-auto py-3 text-center"
                                        onClick={() => field.onChange('borrowed')}
                                    >
                                        <div>
                                            <span className="font-semibold">I Borrowed Money</span>
                                            <p className={cn("text-xs font-normal", field.value === 'borrowed' ? "text-primary-foreground/80" : "text-muted-foreground")}>I owe {personNameValue || 'someone'}</p>
                                        </div>
                                    </Button>
                                </div>
                             </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : (
                <FormField
                    control={form.control} name="transactionType"
                    render={({ field }) => (
                        <FormItem><FormLabel>Transaction Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="lent">I lent more money</SelectItem>
                                <SelectItem value="borrowed">I borrowed more money</SelectItem>
                                <SelectItem value="repayment_received">I received a repayment</SelectItem>
                                <SelectItem value="repayment_made">I made a repayment</SelectItem>
                            </SelectContent>
                        </Select>
                        {transactionType && (
                            <FormDescription>
                                {transactionTypeDescriptions[transactionType]}
                            </FormDescription>
                        )}
                        <FormMessage /></FormItem>
                    )}
                />
            )}

            <FormField
              control={form.control} name="amount"
              render={({ field }) => (
                <FormItem><FormLabel>Amount</FormLabel><FormControl><CurrencyInput value={field.value ?? 0} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )}
            />
            
            <FormField
                control={form.control} name="date"
                render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant={"outline"} className={cn("justify-start text-left font-normal",!field.value && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
           
            <FormField
              control={form.control} name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a bank account" /></SelectTrigger></FormControl>
                    <SelectContent>{bankAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Loan transactions can only be made with bank accounts, not credit accounts.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control} name="notes"
                render={({ field }) => (
                    <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., For lunch" {...field} /></FormControl><FormMessage /></FormItem>
                )}
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
              <Button type="submit">Record Transaction</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
