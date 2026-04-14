
'use server';

/**
 * @fileOverview A flow that generates cashback optimization insights.
 * - generateCashbackInsights - Analyzes credit card spending to find opportunities for maximizing cashback rewards.
 * - GenerateCashbackInsightsInput - The input type for the function.
 * - GenerateCashbackInsightsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExpenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  categoryId: z.string(),
  accountId: z.string().optional(),
});

const AccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["Bank Account", "Credit Account"]),
    cashbackPercentage: z.number().optional(),
});

const CategorySchema = z.object({
    id: z.string(),
    name: z.string(),
});

const GenerateCashbackInsightsInputSchema = z.object({
  expenses: z.array(ExpenseSchema).describe("A list of expenses within the analyzed date range."),
  accounts: z.array(AccountSchema).describe("A list of all the user's accounts, especially credit accounts with cashback rates."),
  categories: z.array(CategorySchema).describe("The user's list of spending categories."),
  currency: z.string().describe("The user's selected currency code (e.g., USD, INR).")
});
export type GenerateCashbackInsightsInput = z.infer<typeof GenerateCashbackInsightsInputSchema>;

const GenerateCashbackInsightsOutputSchema = z.object({
  insight: z.string().describe("A concise (1-2 sentences) and actionable insight suggesting how the user could have earned more cashback. If no optimization is possible, it should state that they are maximizing their rewards effectively."),
});
export type GenerateCashbackInsightsOutput = z.infer<typeof GenerateCashbackInsightsOutputSchema>;

export async function generateCashbackInsights(input: GenerateCashbackInsightsInput): Promise<GenerateCashbackInsightsOutput> {
  return generateCashbackInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCashbackInsightsPrompt',
  input: { schema: GenerateCashbackInsightsInputSchema },
  output: { schema: GenerateCashbackInsightsOutputSchema },
  prompt: `
    You are a financial analyst specializing in credit card rewards. Your task is to analyze a user's spending on their credit cards and provide a single, actionable insight on how they could maximize their cashback.

    **Data:**
    - Currency: {{currency}}
    - Expenses: {{{json expenses}}}
    - Accounts: {{{json accounts}}}
    - Categories: {{{json categories}}}

    **Instructions:**

    1.  **Identify Credit Cards:** Filter the accounts to find only 'Credit Account' types that have a \`cashbackPercentage\` greater than 0.
    2.  **Analyze Spending:** For each credit card, analyze the expenses paid with it.
    3.  **Find Optimization Opportunity:** Identify the single biggest opportunity for improvement. This usually means finding a high-spending category that was paid for with a low-cashback card, when a higher-cashback card was available.
    4.  **Calculate Potential Gain:** Calculate the potential additional cashback the user could have earned. For example, if they spent 500 on 'Groceries' with a 1% card but had a 3% card available, the potential gain is (500 * 0.03) - (500 * 0.01) = 10.
    5.  **Formulate Insight:** Create a concise, helpful, and encouraging insight. When mentioning money, use the provided currency code (e.g., "15 {{currency}}").
        *   **If an opportunity is found:** State the specific action and the potential gain. E.g., "You're doing great! For even more rewards, try using your [Higher Cashback Card Name] for all 'Groceries' purchases. You could have earned an extra 15 {{currency}} in cashback this period."
        *   **If NO opportunity is found:** Congratulate the user. E.g., "Excellent work! You are effectively maximizing your cashback rewards with your current spending habits."
        *   **If there is not enough data:** (e.g., no credit cards with cashback, or no spending on them), return a neutral statement like "Once you add credit cards with cashback percentages and log some expenses, we can provide optimization tips here."
    6.  **Constraint:** Focus only on the single most impactful insight. Do not provide a list of suggestions.
  `,
});

const generateCashbackInsightsFlow = ai.defineFlow(
  {
    name: 'generateCashbackInsightsFlow',
    inputSchema: GenerateCashbackInsightsInputSchema,
    outputSchema: GenerateCashbackInsightsOutputSchema,
  },
  async (input) => {
    const creditCards = input.accounts.filter(a => a.type === 'Credit Account' && (a.cashbackPercentage || 0) > 0);
    if (creditCards.length < 1) {
        return { insight: "Add credit cards with cashback rates to get optimization insights." };
    }
    
    const { output } = await prompt(input);
    return output!;
  }
);

