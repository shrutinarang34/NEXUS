import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import Script from "next/script";

const APP_NAME = "Nexus";
const APP_URL = new URL(
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:9002"
);
const APP_DESCRIPTION =
  "The simple, beautiful, and powerful way to track expenses, manage budgets, and achieve your financial goals.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: "Nexus - Take Control of Your Finances, Effortlessly",
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  icons: {
    icon: "/images/favicon.ico",
    apple: "/images/app-logo.png",
  },
  metadataBase: APP_URL,
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: "Nexus - Take Control of Your Finances, Effortlessly",
      template: `%s | ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
    url: APP_URL,
    images: {
      url: "/images/og-image.png", // Recommended size 1200x630
      alt: "Nexus Dashboard on a device",
    },
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: "Nexus - Take Control of Your Finances, Effortlessly",
      template: `%s | ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
    images: {
      url: "/images/og-image.png", // Recommended size 1200x630
      alt: "Nexus Dashboard on a device",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
            <Script
              id="gtag-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
                `,
              }}
            />
          </>
        )}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
