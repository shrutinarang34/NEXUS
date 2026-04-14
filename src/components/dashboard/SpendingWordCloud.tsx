
"use client";

import React from 'react';
import WordCloud from 'react-d3-cloud';
import type { Word } from 'd3-cloud';
import { useTheme } from 'next-themes';

const FONT_FAMILY = 'Inter';

const wordCloudColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface SpendingWordCloudProps {
    data: Word[];
}

export function SpendingWordCloud({ data }: SpendingWordCloudProps) {
  const { resolvedTheme } = useTheme();

  const fill = (word: Word, index: number) => {
    return wordCloudColors[index % wordCloudColors.length];
  };

  const onWordClick = (event: React.MouseEvent<SVGTextElement, MouseEvent>, word: Word) => {
    console.log(`Clicked on ${word.text}`);
  };

  // We need to check for window to ensure this code only runs on the client.
  const [size, setSize] = React.useState([500, 300]);
  React.useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
        const parent = document.querySelector('.h-80');
        if (parent) {
            setSize([parent.clientWidth, parent.clientHeight]);
        }
    }
  }, []);

  const maxAmount = React.useMemo(() => data.reduce((max, word) => Math.max(max, word.value), 0), [data]);
  const fontSize = (word: Word) => {
    // Scale font size based on amount.
    // The scale can be adjusted for better visual representation.
    const minSize = 12;
    const maxSize = 60;
    const scale = (word.value / maxAmount);
    return minSize + (scale * (maxSize - minSize));
  };


  if (data.length === 0) {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Not enough data for word cloud.</p>
        </div>
    );
  }

  return (
    <WordCloud
      data={data}
      font={FONT_FAMILY}
      padding={5}
      fill={fill}
      onWordClick={onWordClick}
      width={size[0]}
      height={size[1]}
      fontSize={fontSize}
      rotate={0}
    />
  );
}
