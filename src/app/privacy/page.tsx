import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold tracking-tight font-headline">
              Privacy Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Last updated:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>

            <h2 className="text-2xl font-semibold font-headline">
              Introduction
            </h2>
            <p>
              Welcome to Nexus. We are committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our application.
            </p>

            <h2 className="text-2xl font-semibold font-headline">
              Information We Collect
            </h2>
            <p>
              We may collect information about you in a variety of ways. The
              information we may collect via the Application includes:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Personal Data:</strong> Personally identifiable
                information, such as your name, email address, that you
                voluntarily give to us when you register with the Application,
                as well as profile information from your Google account if you
                choose to sign up using Google.
              </li>
              <li>
                <strong>Financial Data:</strong> Data related to your finances,
                such as expenses, transactions, accounts, and categories, that
                you voluntarily enter into the application. This data is stored
                securely and is only accessible by you.
              </li>
            </ul>

            <h2 className="text-2xl font-semibold font-headline">
              How We Use Your Information
            </h2>
            <p>
              Having accurate information about you permits us to provide you
              with a smooth, efficient, and customized experience. Specifically,
              we may use information collected about you via the Application to:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Create and manage your account.</li>
              <li>
                Provide the core functionality of expense tracking and financial
                management.
              </li>
              <li>Personalize your user experience.</li>
              <li>Respond to your requests and provide customer support.</li>
            </ul>

            <h2 className="text-2xl font-semibold font-headline">
              Data Storage
            </h2>
            <p>
              All your data, including personal and financial information, is
              stored on Google Firebase services (Firebase Authentication and
              Firestore). Google Firebase has a robust security policy which you
              can review{" "}
              <a
                href="https://firebase.google.com/support/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                here
              </a>
              . We rely on their security measures to protect your data.
            </p>

            <h2 className="text-2xl font-semibold font-headline">
              Disclosure of Your Information
            </h2>
            <p>
              We do not sell, trade, or otherwise transfer your personally
              identifiable information to outside parties. Your data is used
              solely for the purpose of providing and improving the service to
              you.
            </p>

            <h2 className="text-2xl font-semibold font-headline">
              Security of Your Information
            </h2>
            <p>
              We use administrative, technical, and physical security measures
              to help protect your personal information. While we have taken
              reasonable steps to secure the personal information you provide to
              us, please be aware that despite our efforts, no security measures
              are perfect or impenetrable, and no method of data transmission
              can be guaranteed against any interception or other type of
              misuse.
            </p>

            <h2 className="text-2xl font-semibold font-headline">
              Your Data Rights
            </h2>
            <p>
              You have the right to access, update, or delete your information.
              You can manage your account and associated data from the settings
              page within the application. Deleting your account will
              permanently remove all your data from our systems.
            </p>

            <h2 className="text-2xl font-semibold font-headline">
              Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new Privacy Policy on
              this page. You are advised to review this Privacy Policy
              periodically for any changes.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
