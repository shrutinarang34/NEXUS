
'use server';

/**
 * @fileOverview A flow that automatically allocates a budget based on historical spending.
 * - autoAllocateBudget - Analyzes past expenses to suggest category allocations for a new budget.
 * - AutoAllocateBudgetInput - The input type for the autoAllocateBudget function.
 * - AutoAllocateBudgetOutput - The return type for the autoAllocateBudget function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ExpenseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  amount: z.number(),
  date: z.string().describe("The date of the expense in ISO format."),
  categoryId: z.string(),
  accountId: z.string().optional(),
  spentById: z.string().optional(),
  createdAt: z.string().describe("The creation date of the expense in ISO format."),
  itemType: z.literal('expense'),
  cashbackAmount: z.number().optional(),
});

const CategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().optional(),
});

const AutoAllocateBudgetInputSchema = z.object({
  totalAmount: z.number().describe("The total amount for the new budget."),
  expenses: z.array(ExpenseSchema).describe("A list of historical expenses to analyze for spending patterns."),
  categories: z.array(CategorySchema).describe("The full list of available categories to allocate funds to."),
});
export type AutoAllocateBudgetInput = z.infer<typeof AutoAllocateBudgetInputSchema>;

const AutoAllocateBudgetOutputSchema = z.object({
    allocations: z.array(z.object({
        categoryId: z.string().describe("The ID of the category to allocate for."),
        amount: z.number().describe("The suggested amount to allocate to this category, rounded to the nearest dollar."),
    })).describe("An array of category allocations. The sum of all allocated amounts MUST equal the totalAmount from the input. Only include allocations for categories where historical spending exists."),
});
export type AutoAllocateBudgetOutput = z.infer<typeof AutoAllocateBudgetOutputSchema>;

export async function autoAllocateBudget(input: AutoAllocateBudgetInput): Promise<AutoAllocateBudgetOutput> {
  return autoAllocateBudgetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autoAllocateBudgetPrompt',
  input: {schema: AutoAllocateBudgetInputSchema},
  output: {schema: AutoAllocateBudgetOutputSchema},
  prompt: `
    You are an expert financial planner AI. Your task is to create a sensible budget allocation based on a user's past spending habits.

    **Budget Details:**
    - Total Budget Amount: {{totalAmount}}

    **User's Data:**
    - Historical Expenses: {{{json expenses}}}
    - Available Categories: {{{json categories}}}

    **Instructions:**

    1.  **Analyze Historical Spending:** Review the provided expense history to understand the user's spending patterns. Calculate the average monthly spending for each category.
    2.  **Allocate the Budget:** Distribute the \`totalAmount\` across the relevant categories based on the historical data.
    3.  **Prioritize:** Give more weight to categories with consistent and higher spending. For categories with sporadic or no spending, allocate little to no budget unless they are essential (like 'Rent/Mortgage' or 'Utilities').
    4.  **Ensure Full Allocation:** The sum of all your suggested category allocations in the output MUST exactly equal the \`totalAmount\` provided in the input. Adjust amounts as necessary to meet this total.
    5.  **Rounding:** Round all allocation amounts to the nearest whole dollar.
    6.  **Output Format:** Return the result as a JSON object matching the output schema, containing a list of allocations. Only include categories that have a suggested allocation amount greater than zero.
  `,
});

const autoAllocateBudgetFlow = ai.defineFlow(
  {
    name: 'autoAllocateBudgetFlow',
    inputSchema: AutoAllocateBudgetInputSchema,
    outputSchema: AutoAllocateBudgetOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
