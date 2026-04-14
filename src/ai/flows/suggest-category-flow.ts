
'use server';

/**
 * @fileOverview A flow that suggests a category for a given expense name.
 * - suggestCategory - Suggests a category based on the expense name and available categories.
 * - SuggestCategoryInput - The input type for the suggestCategory function.
 * - SuggestCategoryOutput - The return type for the suggestCategory function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const CategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().optional(),
});

const SuggestCategoryInputSchema = z.object({
  expenseName: z.string().describe("The name of the expense, e.g., 'Starbucks Coffee' or 'Monthly Train Pass'."),
  categories: z.array(CategorySchema).describe("The list of available categories the user has defined."),
});
export type SuggestCategoryInput = z.infer<typeof SuggestCategoryInputSchema>;


const SuggestCategoryOutputSchema = z.object({
  categoryId: z.string().describe("The ID of the suggested category from the provided list. Should be one of the IDs from the input categories array."),
});
export type SuggestCategoryOutput = z.infer<typeof SuggestCategoryOutputSchema>;


export async function suggestCategory(input: SuggestCategoryInput): Promise<SuggestCategoryOutput> {
  return suggestCategoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCategoryPrompt',
  input: { schema: SuggestCategoryInputSchema },
  output: { schema: SuggestCategoryOutputSchema },
  prompt: `
    You are an expert at categorizing financial expenses.
    Based on the user's expense name and their list of available categories, determine the most appropriate category for the expense.
    
    Your response MUST be one of the category IDs from the provided list.

    Expense Name: "{{expenseName}}"

    Available Categories (with IDs):
    {{{json categories}}}
  `,
});

const suggestCategoryFlow = ai.defineFlow(
  {
    name: 'suggestCategoryFlow',
    inputSchema: SuggestCategoryInputSchema,
    outputSchema: SuggestCategoryOutputSchema,
  },
  async (input) => {
    // Prevent calling the AI for very short or generic terms
    if (input.expenseName.length < 3) {
        return { categoryId: '' };
    }
    const { output } = await prompt(input);
    return output!;
  }
);
