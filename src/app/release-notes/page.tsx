import { AppShell } from "@/components/AppShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import packageJson from "@/../package.json";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReleaseNotesPage() {
  const appVersion = packageJson.version;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/" passHref>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Release Notes
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Version 1.7.0</CardTitle>
            <CardDescription>
              Released on:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 prose dark:prose-invert max-w-none">
            <h3 className="font-semibold">✨ New Features & Enhancements</h3>
            <ul className="list-disc list-inside">
              <li>
                <b>Spending by Category Table:</b> The main dashboard now
                includes a detailed table at the bottom, showing the total
                amount spent for each category within the selected date range.
                This provides a clear, at-a-glance summary of your spending
                habits.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Version 1.6.0</CardTitle>
            <CardDescription>
              Released on:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 prose dark:prose-invert max-w-none">
            <h3 className="font-semibold">✨ New Features & Enhancements</h3>
            <ul className="list-disc list-inside">
              <li>
                <b>Improved Mobile Data Entry:</b> All currency input fields
                throughout the app will now automatically display a numeric
                keypad (numpad) on mobile devices. This makes it much faster and
                easier to enter amounts for expenses, transactions, and budgets
                when you're on the go.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Version 1.5.0</CardTitle>
            <CardDescription>
              Released on:{" "}
              {new Date("2024-08-22").toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 prose dark:prose-invert max-w-none">
            <h3 className="font-semibold">✨ New Features & Enhancements</h3>
            <ul className="list-disc list-inside">
              <li>
                <b>Comprehensive Delete & Reversal:</b> You can now safely
                delete any expense, transaction, or loan payment. A confirmation
                dialog shows you exactly how your account balances will be
                reverted, ensuring your financial data remains accurate.
              </li>
              <li>
                <b>Cleaner Pie Charts:</b> All pie charts across the application
                have been improved. They now group smaller items into an
                "Others" category (styled in dark grey), making them much easier
                to read and understand.
              </li>
              <li>
                <b>Preserved Loan History:</b> People you have transacted with
                will now remain in your loans list even after their balance is
                settled, giving you a complete history. A "Settled Up" badge
                makes it clear who has a zero balance.
              </li>
            </ul>

            <h3 className="font-semibold">🐛 Bug Fixes & Major Improvements</h3>
            <ul className="list-disc list-inside">
              <li>
                <b>Firestore Indexing Fix:</b> Resolved a critical backend error
                that required a manual index for processing recurring items and
                fetching loan histories. The query logic has been optimized to
                prevent this crash from occurring.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Version 1.4.0</CardTitle>
            <CardDescription>
              Released on:{" "}
              {new Date("2024-08-20").toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 prose dark:prose-invert max-w-none">
            <h3 className="font-semibold">✨ New Features & Enhancements</h3>
            <ul className="list-disc list-inside">
              <li>
                <b>Multi-Currency Support:</b> You can now set your default
                currency from a comprehensive list in the settings. All
                financial data throughout the app—including on the dashboard, in
                charts, and within AI insights—will now be displayed in your
                chosen currency.
              </li>
            </ul>

            <h3 className="font-semibold">🐛 Bug Fixes & Major Improvements</h3>
            <ul className="list-disc list-inside">
              <li>
                <b>Accurate Cash Flow Chart:</b> The main dashboard chart has
                been updated from "Income vs. Expense" to a more accurate "Money
                In vs. Money Out" comparison. This chart now correctly includes
                deposits and withdrawals from loan transactions, giving you a
                true picture of your cash flow.
              </li>
              <li>
                <b>Double-Entry for Loans:</b> Loan transactions now correctly
                create a corresponding deposit or withdrawal, ensuring your
                account balances (assets) and loan balances
                (receivables/payables) are always in sync.
              </li>
              <li>
                <b>Correct Liability Calculation:</b> Fixed a critical bug where
                credit card liability was calculated incorrectly for transfers
                and payments. Liabilities now only decrease when a payment is
                made to the card.
              </li>
              <li>
                <b>Loan Account Restriction:</b> Loan transactions can now only
                be made with bank/cash accounts, preventing the use of credit
                cards for loans.
              </li>
              <li>
                <b>AI Currency Awareness:</b> The AI-powered financial insights
                will now correctly reference your chosen currency instead of a
                hardcoded "$" symbol.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Version 1.3.0</CardTitle>
            <CardDescription>
              Released on:{" "}
              {new Date("2024-08-15").toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 prose dark:prose-invert max-w-none">
            <h3 className="font-semibold">✨ New Features & Enhancements</h3>
            <ul className="list-disc list-inside">
              <li>
                <b>Comprehensive Analytics:</b> Added Google Analytics with
                detailed event tracking for nearly every user action, including
                logins, data entry (expenses, accounts, etc.), and feature
                usage. This will help us improve the user experience based on
                real data.
              </li>
              <li>
                <b>Manual Recurring Item Processing:</b> A "Process Items"
                button has been added to the Recurring page. This gives you
                control to manually trigger the processing of your scheduled
                expenses and transactions at any time.
              </li>
            </ul>

            <h3 className="font-semibold">🐛 Bug Fixes & Improvements</h3>
            <ul className="list-disc list-inside">
              <li>
                <b>Recurring Items Logic:</b> Fixed a bug that caused overdue
                recurring items to be missed. The processing logic now correctly
                "catches up" on all past-due items and accurately calculates the
                next due date.
              </li>
              <li>
                <b>UI Display Fix:</b> The table on the Recurring Items page now
                correctly displays the `nextDueDate` instead of the `startDate`.
              </li>
              <li>
                <b>Code Cleanup:</b> Removed all functionality and dependencies
                related to the previous PDF export feature.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Version 1.2.0</CardTitle>
            <CardDescription>
              Released on:{" "}
              {new Date("2024-08-14").toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 prose dark:prose-invert max-w-none">
            <h3 className="font-semibold">✨ New Features & Enhancements</h3>
            <ul className="list-disc list-inside">
              <li>
                <b>Customizable Default Date Range:</b> You can now set your
                preferred default date range (e.g., This Month, YTD) in the
                settings. The app-wide default for new users is "Year-to-Date".
              </li>
              <li>
                <b>Word Cloud Filtering:</b> The "Spending Hotspots" word cloud
                on the dashboard now includes a "Max Amount" filter. This lets
                you exclude large, predictable expenses (like rent) to better
                visualize patterns in your discretionary spending.
              </li>
              <li>
                <b>Heatmap Category Toggles:</b> You now have full control over
                which categories appear in the "Expense Consistency" heatmap.
                Toggle their visibility from the Categories settings page.
              </li>
              <li>
                <b>Improved Chart Labels:</b> All pie charts now feature
                percentage labels with connecting lines, making them easier to
                read and understand at a glance.
              </li>
            </ul>

            <h3 className="font-semibold">💅 Improvements</h3>
            <ul className="list-disc list-inside">
              <li>
                <b>Consistent Chart Tooltips:</b> All chart tooltips across the
                application now correctly format values with a dollar symbol and
                use a consistent font for better readability.
              </li>
              <li>
                <b>Dynamic Heatmap Coloring:</b> The heatmap's color scaling has
                been significantly improved. It now uses a dynamic, granular
                gradient calculated on a per-month basis, providing a much more
                accurate and intuitive visualization of your spending.
              </li>
            </ul>

            <h3 className="font-semibold">🐛 Bug Fixes</h3>
            <ul className="list-disc list-inside">
              <li>
                <b>Recurring Items Logic:</b> Fixed a critical bug that caused
                recurring items to be created repeatedly on every page load. The
                new logic correctly processes items only once on their due date,
                checks for manual entries with the same name to prevent
                duplicates, and accurately calculates the next due date.
              </li>
              <li>
                Fixed a bug where an incorrect data structure for the "Account
                Spending" chart would cause a runtime error.
              </li>
              <li>
                The recurring items processor is now more resilient and will not
                crash if it encounters older items created without a
                `nextDueDate`.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Version 1.1.0</CardTitle>
            <CardDescription>
              Released on:{" "}
              {new Date("2024-07-20").toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 prose dark:prose-invert max-w-none">
            <h3 className="font-semibold">✨ New Features</h3>
            <ul className="list-disc list-inside">
              <li>
                <b>AI-Powered Category Suggestions:</b> When adding an expense,
                the app now uses AI to automatically suggest a category based on
                the expense name, speeding up data entry. This can be
                enabled/disabled from the settings.
              </li>
              <li>
                <b>Needs vs. Wants Analysis:</b> A new pie chart on the
                dashboard breaks down your spending into "Needs" and "Wants",
                giving you a high-level overview of your spending habits. You
                can classify each category in the settings.
              </li>
              <li>
                <b>CSV Expense Import:</b> You can now import your expenses from
                a CSV file directly from the Expenses page. A sample file is
                available for download to help with formatting.
              </li>
              <li>
                <b>Top Expenses Card:</b> The dashboard now includes a "Top
                Expenses" card that lists your most significant expenses, with
                options to sort by largest, smallest, most recent, or oldest.
              </li>
            </ul>

            <h3 className="font-semibold">💅 Improvements</h3>
            <ul className="list-disc list-inside">
              <li>
                The dashboard layout has been improved to give the "Spending
                Hotspots" word cloud its own full-width row for better
                visibility.
              </li>
              <li>
                When there is no data for the "Needs vs. Wants" or "Cashback"
                charts, the cards will now display a message instead of
                disappearing, creating a more stable layout.
              </li>
              <li>
                The "Export CSV" functionality has been moved from the dashboard
                to the Expenses page to be more contextually relevant.
              </li>
            </ul>

            <h3 className="font-semibold">🐛 Bug Fixes</h3>
            <ul className="list-disc list-inside">
              <li>
                Fixed a bug where form dialogs (Add Expense, Add Budget, etc.)
                were not scrollable on small screen devices, sometimes hiding
                form fields.
              </li>
              <li>
                Fixed an issue where the expense name suggestion popover would
                not close on the first click, requiring a second click to
                dismiss.
              </li>
              <li>
                Corrected a styling issue where the "Loans" feature toggle in
                settings was incorrectly styled as an AI feature.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Version 1.0.1</CardTitle>
            <CardDescription>
              Released on:{" "}
              {new Date("2024-05-20").toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 prose dark:prose-invert max-w-none">
            <h3 className="font-semibold">✨ New Features</h3>
            <ul className="list-disc list-inside">
              <li>
                <b>Last Login Tracking:</b> You can now see the user's last
                login date and time in the sidebar, right below their email
                address.
              </li>
            </ul>

            <h3 className="font-semibold">❌ Removed Features</h3>
            <ul className="list-disc list-inside">
              <li>
                <b>Recurring Expenses:</b> This feature has been temporarily
                removed due to a persistent bug that could cause server
                instability. We apologize for the inconvenience and will work to
                bring a more robust version back in a future release.
              </li>
            </ul>

            <h3 className="font-semibold">🐛 Bug Fixes</h3>
            <ul className="list-disc list-inside">
              <li>
                Fixed a bug that prevented the "Transactions" link in the
                sidebar from showing in its disabled state correctly.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Version 1.0.0</CardTitle>
            <CardDescription>Initial Release</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 prose dark:prose-invert max-w-none">
            <p>
              Welcome to the first version of Nexus! This release includes all
              the core features to help you take control of your finances:
            </p>
            <ul className="list-disc list-inside">
              <li>Dashboard with financial overview</li>
              <li>Detailed expense and transaction tracking</li>
              <li>Budget creation and management</li>
              <li>Loan tracking for money lent and borrowed</li>
              <li>AI-powered financial insights</li>
              <li>Customizable categories, accounts, and household members</li>
              <li>Light and dark mode support</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
