// lib/analytics.ts

// Helper function to log a page view
export const pageview = (url: string) => {
  if (process.env.NEXT_PUBLIC_GA_ID) {
    window.gtag("config", process.env.NEXT_PUBLIC_GA_ID, {
      page_path: url,
    });
  }
};

// Generic event logger
interface GtagEventProps {
  action: string;
  category: string;
  label: string;
  value?: number;
}

export const gtagEvent = ({ action, category, label, value }: GtagEventProps) => {
  if (process.env.NEXT_PUBLIC_GA_ID) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};
