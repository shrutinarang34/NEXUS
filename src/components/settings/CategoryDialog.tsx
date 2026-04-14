

"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
import type { Category } from "@/types";
import { useAuth } from "@/lib/auth";
import {
  addCategory,
  updateCategory,
} from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { IconPicker } from "@/components/IconPicker";
import React from "react";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { gtagEvent } from "@/lib/analytics";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  icon: z.string().optional(),
  type: z.enum(["Need", "Want", "Uncategorized"]).optional(),
  showInHeatmap: z.boolean().default(true),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  category?: Category | null;
  onCategoryAdded?: () => void;
  onCategoryUpdated?: () => void;
}

export function CategoryDialog({ 
    isOpen, 
    onOpenChange, 
    category,
    onCategoryAdded,
    onCategoryUpdated,
}: CategoryDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
  });

  React.useEffect(() => {
    if(isOpen) {
        form.reset(
            category
              ? { name: category.name, icon: category.icon || "Smile", type: category.type || "Uncategorized", showInHeatmap: category.showInHeatmap ?? true }
              : { name: "", icon: "Smile", type: "Uncategorized", showInHeatmap: true }
          );
    }
  }, [isOpen, category, form]);

  const onSubmit = async (values: CategoryFormValues) => {
    if (!user) return;
    try {
      if (category) {
        await updateCategory(user.uid, category.id, values);
        toast({ description: "Category updated." });
        gtagEvent({ action: 'update_category', category: 'Category', label: values.name });
        onCategoryUpdated?.();
      } else {
        await addCategory(user.uid, values);
        toast({ description: "Category added." });
        gtagEvent({ action: 'add_category', category: 'Category', label: values.name });
        onCategoryAdded?.();
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save category.",
      });
      gtagEvent({ action: 'category_error', category: 'Error', label: category ? 'Update Category Failed' : 'Add Category Failed' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">
            {category ? "Edit Category" : "Add Category"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Groceries" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                  <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <FormControl>
                          <IconPicker
                              value={field.value || 'Smile'}
                              onChange={field.onChange}
                          />
                      </FormControl>
                  </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Category Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="Need" id="need" />
                        </FormControl>
                        <FormLabel htmlFor="need" className="font-normal">Need</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="Want" id="want" />
                        </FormControl>
                        <FormLabel htmlFor="want" className="font-normal">Want</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="Uncategorized" id="uncategorized" />
                        </FormControl>
                        <FormLabel htmlFor="uncategorized" className="font-normal">Uncategorized</FormLabel>
                      </FormItem>
                    </RadioGroup>
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
                {category ? "Save Changes" : "Add Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
