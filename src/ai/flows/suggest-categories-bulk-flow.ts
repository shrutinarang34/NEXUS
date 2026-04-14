
'use server';

/**
 * @fileOverview A flow that suggests categories for a list of expenses in bulk.
 * - suggestCategoriesBulk - Suggests categories based on expense names and available categories.
 * - SuggestCategoriesBulkInput - The input type for the function.
 * - SuggestCategoriesBulkOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const CategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().optional(),
});

const ItemToCategorizeSchema = z.object({
    id: z.string().describe("The unique identifier for the item being categorized."),
    description: z.string().describe("The description of the expense, e.g., 'Starbucks Coffee' or 'Monthly Train Pass'."),
});

const SuggestCategoriesBulkInputSchema = z.object({
  items: z.array(ItemToCategorizeSchema).describe("A list of items to be categorized."),
  categories: z.array(CategorySchema).describe("The list of available categories the user has defined."),
});
export type SuggestCategoriesBulkInput = z.infer<typeof SuggestCategoriesBulkInputSchema>;

const SuggestedCategorySchema = z.object({
    id: z.string().describe("The ID of the item that was categorized."),
    categoryId: z.string().describe("The ID of the most appropriate category from the provided list. Should be one of the IDs from the input categories array."),
});

const SuggestCategoriesBulkOutputSchema = z.array(SuggestedCategorySchema);
export type SuggestCategoriesBulkOutput = z.infer<typeof SuggestCategoriesBulkOutputSchema>;

export async function suggestCategoriesBulk(input: SuggestCategoriesBulkInput): Promise<SuggestCategoriesBulkOutput> {
  return suggestCategoriesBulkFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCategoriesBulkPrompt',
  input: { schema: SuggestCategoriesBulkInputSchema },
  output: { schema: SuggestCategoriesBulkOutputSchema },
  prompt: `
    You are an expert at categorizing financial expenses.
    Based on the list of expense descriptions and the user's available categories, determine the most appropriate category for EACH expense.
    
    Your response MUST be an array of objects, where each object contains the original item 'id' and the 'categoryId' of the suggested category from the provided list.
    
    Example:
    Input: { items: [{id: '1', description: 'Tim Hortons'}], categories: [{id: 'cat-1', name: 'Food'}] }
    Output: [{id: '1', categoryId: 'cat-1'}]
    
    ---

    Items to Categorize:
    {{{json items}}}

    Available Categories (with IDs):
    {{{json categories}}}
  `,
});

const suggestCategoriesBulkFlow = ai.defineFlow(
  {
    name: 'suggestCategoriesBulkFlow',
    inputSchema: SuggestCategoriesBulkInputSchema,
    outputSchema: SuggestCategoriesBulkOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output || [];
  }
);

