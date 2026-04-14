

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2, RotateCcw, ArrowLeft, ArrowUpDown } from "lucide-react";
import type { Category } from "@/types";
import { useAuth } from "@/lib/auth";
import {
  deleteCategory,
  resetCategories,
  updateCategory,
} from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { Icon } from "@/components/Icon";
import { CategoryDialog } from "./CategoryDialog";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, SortingState } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { Switch } from "../ui/switch";
import { gtagEvent } from "@/lib/analytics";

interface CategoryManagerProps {
  categories: Category[];
  onCategoriesChange: () => void;
}

export function CategoryManager({
  categories,
  onCategoriesChange,
}: CategoryManagerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);


  const openDialog = (category: Category | null = null) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!user) return;
    try {
      await deleteCategory(user.uid, categoryId);
      toast({ description: "Category deleted." });
      gtagEvent({ action: 'delete_category', category: 'Category', label: categoryId });
      onCategoriesChange();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete category.",
      });
      gtagEvent({ action: 'category_error', category: 'Error', label: 'Delete Category Failed' });
    }
  };
  
  const handleReset = async () => {
    if (!user) return;
    try {
      await resetCategories(user.uid);
      toast({ description: "Default categories have been added." });
      gtagEvent({ action: 'reset_categories', category: 'Category', label: 'Reset to Default' });
      onCategoriesChange();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reset categories.",
      });
      gtagEvent({ action: 'category_error', category: 'Error', label: 'Reset Categories Failed' });
    }
  }

  const handleCategoryChange = () => {
    onCategoriesChange();
    setIsDialogOpen(false);
    setEditingCategory(null);
  }

  const handleToggleHeatmap = async (category: Category) => {
    if (!user) return;
    try {
      await updateCategory(user.uid, category.id, { showInHeatmap: !(category.showInHeatmap ?? true) });
      gtagEvent({ action: 'toggle_heatmap_category', category: 'Category', label: category.name, value: !(category.showInHeatmap ?? true) ? 1 : 0 });
      onCategoriesChange();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update category setting.",
      });
      gtagEvent({ action: 'category_error', category: 'Error', label: 'Toggle Heatmap Failed' });
    }
  };

  const columns: ColumnDef<Category>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Category Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-medium">
          <Icon name={row.original.icon || 'Smile'} />
          {row.original.name}
        </div>
      )
    },
     {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.type || 'Uncategorized';
        return <Badge variant={type === 'Need' ? 'default' : type === 'Want' ? 'secondary' : 'outline'} className="capitalize">{type}</Badge>
      }
    },
    {
        accessorKey: "showInHeatmap",
        header: "Show in Heatmap",
        cell: ({ row }) => (
            <Switch
                checked={row.original.showInHeatmap ?? true}
                onCheckedChange={() => handleToggleHeatmap(row.original)}
            />
        )
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openDialog(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const table = useReactTable({
      data: categories,
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
              <h1 className="text-3xl font-bold tracking-tight font-headline">Categories</h1>
              <p className="text-muted-foreground">Manage your expense categories.</p>
            </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4"/>
                Reset to Default
            </Button>
            <Button onClick={() => openDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </div>
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
                  No categories found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CategoryDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        category={editingCategory}
        onCategoryAdded={handleCategoryChange}
        onCategoryUpdated={handleCategoryChange}
      />
    </>
  );
}
