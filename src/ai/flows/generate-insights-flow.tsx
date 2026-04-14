
'use server';

/**
 * @fileOverview A flow that generates financial insights based on user's expense and transaction data.
 * - generateFinancialInsights - Analyzes financial data to provide key takeaways and comparisons.
 * - GenerateInsightsInput - The input type for the generateFinancialInsights function.
 * - GenerateInsightsOutput - The return type for the generateFinancialInsights function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Expense, Transaction, Category, Account, Budget, Person } from '@/types';

// Schemas for data serialization
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

const TransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(["Deposit", "Withdrawal", "Transfer"]),
  amount: z.number(),
  date: z.string().describe("The date of the transaction in ISO format."),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  description: z.string(),
  createdAt: z.string().describe("The creation date of the transaction in ISO format."),
  itemType: z.literal('transaction'),
});

const CategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().optional(),
});

const AccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["Bank Account", "Credit Account"]),
    icon: z.string().optional(),
    balance: z.number(),
    isDefault: z.boolean().optional(),
});

const BudgetSchema = z.object({
    id: z.string(),
    name: z.string(),
    amount: z.number(),
    period: z.enum(["monthly", "yearly", "custom"]),
    startDate: z.string().describe("The start date of the budget in ISO format."),
    endDate: z.string().describe("The end date of the budget in ISO format."),
    allocations: z.array(z.object({
        categoryId: z.string(),
        amount: z.number(),
    })),
});

const PersonSchema = z.object({
    id: z.string(),
    name: z.string(),
    currentBalance: z.number().describe("Positive if they owe money to the user, negative if the user owes them."),
});

const GenerateInsightsInputSchema = z.object({
  expenses: z.array(ExpenseSchema),
  transactions: z.array(TransactionSchema),
  categories: z.array(CategorySchema),
  accounts: z.array(AccountSchema),
  budgets: z.array(BudgetSchema).describe("A list of all budgets. The AI should find the one that is active for the current date range."),
  persons: z.array(PersonSchema).describe("A list of people with whom the user has lent or borrowed money."),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
  }),
});

export type GenerateInsightsInput = z.infer<typeof GenerateInsightsInputSchema>;

const GenerateInsightsOutputSchema = z.object({
  expenseInsights: z.string().describe("A summary of expense-related insights. Should be a few sentences long, written in a helpful and encouraging tone. Focus on spending habits, category breakdowns, and comparisons to previous periods if possible. Compare spending against any active budgets and mention if the user is on track."),
  accountInsights: z.string().describe("A summary of account-related insights. Should be a few sentences long, focusing on cash flow (income vs. expenses), account balance changes, and large transactions. Also comment on the user's net worth, factoring in assets, liabilities, and loans."),
});
export type GenerateInsightsOutput = z.infer<typeof GenerateInsightsOutputSchema>;

export async function generateFinancialInsights(input: GenerateInsightsInput): Promise<GenerateInsightsOutput> {
  const sanitizedInput = {
    ...input,
    persons: input.persons.filter(p => typeof p.currentBalance === 'number' && !isNaN(p.currentBalance)),
  };
  return generateFinancialInsightsFlow(sanitizedInput);
}

const prompt = ai.definePrompt({
  name: 'generateInsightsPrompt',
  input: { schema: GenerateInsightsInputSchema },
  output: { schema: GenerateInsightsOutputSchema },
  prompt: `
    You are a friendly and encouraging financial analyst AI. Your goal is to provide helpful insights into a user's finances based on their financial data for a specific date range. Analyze the provided JSON data and generate a short, easy-to-understand summary for both their expenses and their accounts.

    **Current Date Range for Analysis:** {{dateRange.from}} to {{dateRange.to}}

    **Data:**
    - Expenses: {{{json expenses}}}
    - Transactions: {{{json transactions}}}
    - Categories: {{{json categories}}}
    - Accounts: {{{json accounts}}}
    - Budgets: {{{json budgets}}}
    - Loans (Persons): {{{json persons}}}

    **Instructions:**

    1.  **Analyze Expenses & Budgets:**
        *   Identify the top 3 spending categories for the period.
        *   Calculate the total spending for the period.
        *   **Budget Analysis:** Find if there is an active budget for the current date range. If an active budget exists, compare the total spending against the overall budget amount. Also, compare the spending in specific categories against their allocated amounts in the budget. Mention if they are on track, over budget, or doing well.
        *   Look for any notable spending patterns or large one-off expenses.
        *   Phrase insights in a helpful, non-judgmental tone. If spending is down, frame it as an achievement (e.g., "Great job on reducing your restaurant spending by 20% this month!"). If they are over budget, be encouraging (e.g., "It looks like dining out was a bit over budget, but there's still time to adjust.").
        *   Generate a concise summary (2-4 sentences) for the \`expenseInsights\` output field.

    2.  **Analyze Accounts, Net Worth & Cash Flow:**
        *   Calculate the total income (deposits) and total outflows (withdrawals + expenses).
        *   Determine the net cash flow for the period (income - outflows).
        *   **Net Worth Analysis:** Briefly comment on the user's overall financial position. Calculate total assets (from 'Bank Account' type accounts) and total liabilities (from 'Credit Account' type accounts). Also, factor in receivables (money owed to the user from 'persons' with a positive balance) and payables (money the user owes from 'persons' with a negative balance).
        *   Mention any large deposits or withdrawals that stand out.
        *   Comment on the overall financial health based on the cash flow and net worth.
        *   Generate a concise summary (2-4 sentences) for the \`accountInsights\` output field.

    **Example Output Structure:**
    {
      "expenseInsights": "This month, your top spending areas were Groceries and Transportation. You're doing great staying on track with your overall monthly budget, with 50% remaining. However, you've gone slightly over your 'Restaurants' budget category.",
      "accountInsights": "You had a positive cash flow this month, with your income exceeding your expenses. Your overall net worth is looking strong, with your assets and receivables comfortably outweighing your liabilities."
    }
  `,
});

const generateFinancialInsightsFlow = ai.defineFlow(
  {
    name: 'generateFinancialInsightsFlow',
    inputSchema: GenerateInsightsInputSchema,
    outputSchema: GenerateInsightsOutputSchema,
  },
  async (input) => {
    // Handle the case where there is no data to analyze to prevent errors.
    if (input.expenses.length === 0 && input.transactions.length === 0) {
        return {
            expenseInsights: "There's not enough data in the selected period to generate expense insights. Try adding some expenses or adjusting the date range.",
            accountInsights: "There's not enough data in the selected period to generate account insights. Try adding some transactions or adjusting the date range.",
        };
    }
    
    const { output } = await prompt(input);
    return output!;
  }
);
