
"use client";

import { useState } from "react";
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PlusCircle, Pencil, Trash2, Star, ArrowLeft, ArrowUpDown } from "lucide-react";
import type { HouseholdUser } from "@/types";
import { useAuth } from "@/lib/auth";
import {
  addHouseholdUser,
  updateHouseholdUser,
  deleteHouseholdUser,
  setDefaultHouseholdUser,
} from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import * as md5 from 'md5';
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, SortingState } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { gtagEvent } from "@/lib/analytics";

const householdUserSchema = z.object({
  name: z.string().min(1, "User name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal('')),
});
type HouseholdUserFormValues = z.infer<typeof householdUserSchema>;

interface HouseholdManagerProps {
  householdUsers: HouseholdUser[];
  onHouseholdUsersChange: () => void;
}

export function HouseholdManager({ householdUsers, onHouseholdUsersChange }: HouseholdManagerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<HouseholdUser | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);


  const form = useForm<HouseholdUserFormValues>({
    resolver: zodResolver(householdUserSchema),
    defaultValues: { name: "", email: "" },
  });

  const openDialog = (hUser: HouseholdUser | null = null) => {
    setEditingUser(hUser);
    form.reset(hUser ? { name: hUser.name, email: hUser.email || "" } : { name: "", email: "" });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: HouseholdUserFormValues) => {
    if (!user) return;
    try {
      const avatarUrl = values.email 
        ? `https://www.gravatar.com/avatar/${md5(values.email.trim().toLowerCase())}?d=identicon`
        : `https://www.gravatar.com/avatar/${md5(values.name.trim().toLowerCase())}?d=identicon`;
      
      const dataToSave = { ...values, avatarUrl };

      if (editingUser) {
        await updateHouseholdUser(user.uid, editingUser.id, dataToSave);
        toast({ description: "User updated." });
        gtagEvent({ action: 'update_household_user', category: 'Household', label: values.name });
      } else {
        await addHouseholdUser(user.uid, { ...dataToSave, isDefault: householdUsers.length === 0 });
        toast({ description: "User added." });
        gtagEvent({ action: 'add_household_user', category: 'Household', label: values.name });
      }
      onHouseholdUsersChange();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save user.",
      });
      gtagEvent({ action: 'household_error', category: 'Error', label: editingUser ? 'Update User Failed' : 'Add User Failed' });
    }
  };

  const handleDelete = async (householdUserId: string) => {
    if (!user) return;
    if (householdUsers.length <= 1) {
        toast({ variant: "destructive", description: "You must have at least one user."});
        return;
    }
    const userToDelete = householdUsers.find(u => u.id === householdUserId);
    if(userToDelete?.isDefault) {
        toast({ variant: "destructive", description: "Cannot delete the default user."});
        return;
    }
    try {
      await deleteHouseholdUser(user.uid, householdUserId);
      toast({ description: "User deleted." });
      gtagEvent({ action: 'delete_household_user', category: 'Household', label: householdUserId });
      onHouseholdUsersChange();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete user.",
      });
      gtagEvent({ action: 'household_error', category: 'Error', label: 'Delete User Failed' });
    }
  };

  const handleSetDefault = async (householdUserId: string) => {
    if(!user) return;
    try {
      await setDefaultHouseholdUser(user.uid, householdUserId);
      toast({ description: "Default user updated." });
      gtagEvent({ action: 'set_default_household_user', category: 'Household', label: householdUserId });
      onHouseholdUsersChange();
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to set default user.",
      });
      gtagEvent({ action: 'household_error', category: 'Error', label: 'Set Default User Failed' });
    }
  }

  const columns: ColumnDef<HouseholdUser>[] = [
      {
          accessorKey: 'name',
          header: ({ column }) => (
              <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                  Name <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
          ),
          cell: ({ row }) => (
            <div className="flex items-center gap-2 font-medium">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={row.original.avatarUrl} alt={row.original.name} />
                    <AvatarFallback>{row.original.name?.[0]}</AvatarFallback>
                </Avatar>
                {row.original.name}
                {row.original.isDefault && <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
            </div>
          )
      },
      {
          accessorKey: 'email',
          header: 'Email',
      },
      {
          id: 'actions',
          header: () => <div className="text-right">Actions</div>,
          cell: ({ row }) => (
            <div className="text-right flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleSetDefault(row.original.id)} disabled={row.original.isDefault} title="Set as default">
                    <Star className={cn("h-4 w-4", row.original.isDefault && "text-yellow-400 fill-yellow-400")} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openDialog(row.original)}>
                    <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive" disabled={row.original.isDefault || householdUsers.length <=1}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone. This will permanently delete this user.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(row.original.id)}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          )
      }
  ];

  const table = useReactTable({
      data: householdUsers,
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
              <h1 className="text-3xl font-bold tracking-tight font-headline">Household</h1>
              <p className="text-muted-foreground">Manage members of your household.</p>
            </div>
          </div>
          <Button onClick={() => openDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Member
          </Button>
      </header>

      <div className="border rounded-md">
      <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="p-0">
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
                  No household members found.
              </TableCell>
              </TableRow>
          )}
          </TableBody>
      </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
          <DialogHeader>
              <DialogTitle className="font-headline">
              {editingUser ? "Edit Member" : "Add Member"}
              </DialogTitle>
          </DialogHeader>
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                      <Input placeholder="e.g., Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Email (for Gravatar)</FormLabel>
                      <FormControl>
                      <Input placeholder="e.g., jane@example.com" {...field} />
                      </FormControl>
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
                  {editingUser ? "Save" : "Add"}
                  </Button>
              </DialogFooter>
              </form>
          </Form>
          </DialogContent>
      </Dialog>
    </>
  );
}
