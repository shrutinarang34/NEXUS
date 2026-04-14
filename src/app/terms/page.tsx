import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsAndConditionsPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold tracking-tight font-headline">
              Terms and Conditions
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
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using Nexus (the "Service"), you accept and agree
              to be bound by the terms and provision of this agreement. In
              addition, when using this particular service, you shall be subject
              to any posted guidelines or rules applicable to such services. Any
              participation in this service will constitute acceptance of this
              agreement. If you do not agree to abide by the above, please do
              not use this service.
            </p>

            <h2 className="text-2xl font-semibold font-headline">
              2. Description of Service
            </h2>
            <p>
              The Service is a web-based application designed to help users
              track their personal expenses and financial transactions. The
              Service is provided "as is" and the creators of the service assume
              no responsibility for the timeliness, deletion, mis-delivery or
              failure to store any user data, communications or personalization
              settings.
            </p>

            <h2 className="text-2xl font-semibold font-headline">
              3. User Account, Password, and Security
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              password and account, and are fully responsible for all activities
              that occur under your password or account. You agree to
              immediately notify us of any unauthorized use of your password or
              account or any other breach of security.
            </p>

            <h2 className="text-2xl font-semibold font-headline">
              4. User Conduct
            </h2>
            <p>
              You understand that all information, data, or other materials
              ("Content"), whether publicly posted or privately transmitted, are
              the sole responsibility of the person from whom such Content
              originated. This means that you, and not us, are entirely
              responsible for all Content that you upload, post, email, transmit
              or otherwise make available via the Service.
            </p>

            <h2 className="text-2xl font-semibold font-headline">
              5. Disclaimer of Warranties
            </h2>
            <p>You expressly understand and agree that:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                Your use of the service is at your sole risk. The service is
                provided on an "as is" and "as available" basis. We expressly
                disclaim all warranties of any kind, whether express or implied,
                including, but not limited to the implied warranties of
                merchantability, fitness for a particular purpose and
                non-infringement.
              </li>
              <li>
                Any material downloaded or otherwise obtained through the use of
                the service is done at your own discretion and risk and you will
                be solely responsible for any damage to your computer system or
                loss of data that results from the download of any such
                material.
              </li>
            </ul>

            <h2 className="text-2xl font-semibold font-headline">
              6. Limitation of Liability
            </h2>
            <p>
              You expressly understand and agree that we shall not be liable for
              any direct, indirect, incidental, special, consequential or
              exemplary damages, including but not limited to, damages for loss
              of profits, goodwill, use, data or other intangible losses (even
              if we have been advised of the possibility of such damages),
              resulting from the use or the inability to use the service.
            </p>

            <h2 className="text-2xl font-semibold font-headline">
              7. Termination
            </h2>
            <p>
              You agree that we may, under certain circumstances and without
              prior notice, immediately terminate your account and access to the
              Service. Cause for such termination shall include, but not be
              limited to, (a) breaches or violations of these Terms and
              Conditions, (b) requests by law enforcement or other government
              agencies, (c) a request by you (self-initiated account deletions),
              (d) discontinuance or material modification to the Service.
            </p>

            <h2 className="text-2xl font-semibold font-headline">
              8. Changes to The Terms
            </h2>
            <p>
              We reserve the right to update or change our Terms and Conditions
              at any time and you should check these Terms and Conditions
              periodically. Your continued use of the Service after we post any
              modifications to the Terms and Conditions on this page will
              constitute your acknowledgment of the modifications and your
              consent to abide and be bound by the modified Terms and
              Conditions.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
