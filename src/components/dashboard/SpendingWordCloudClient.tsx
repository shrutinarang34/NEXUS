
'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { Word } from 'd3-cloud';

// Dynamically import the WordCloud component with SSR disabled
const SpendingWordCloud = dynamic(
  () => import('./SpendingWordCloud').then((mod) => mod.SpendingWordCloud),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full" />,
  }
);

interface SpendingWordCloudClientProps {
    data: Word[];
}

export default function SpendingWordCloudClient({ data }: SpendingWordCloudClientProps) {
  return <SpendingWordCloud data={data} />;
}
