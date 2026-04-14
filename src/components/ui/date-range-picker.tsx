

'use client';

import * as React from 'react';
import {format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, subMonths} from 'date-fns';
import {Calendar as CalendarIcon} from 'lucide-react';
import type {DateRange} from 'react-day-picker';

import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Calendar} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import { Separator } from './separator';

interface DateRangePickerProps extends React.ComponentProps<'div'> {
  range?: DateRange;
  onRangeChange?: (range: DateRange | undefined) => void;
  align?: 'start' | 'center' | 'end';
}

export function DateRangePicker({className, range, onRangeChange, align = 'start'}: DateRangePickerProps) {

  const presets = [
    { name: "Today", range: { from: startOfDay(new Date()), to: endOfDay(new Date()) } },
    { name: "Yesterday", range: { from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) } },
    { name: "Last 7 Days", range: { from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) } },
    { name: "Last 30 Days", range: { from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) } },
    { name: "This Month", range: { from: startOfMonth(new Date()), to: endOfDay(new Date()) } },
    { name: "Last Month", range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
    { name: "Year-to-date", range: { from: startOfYear(new Date()), to: endOfDay(new Date()) } },
  ];
  
  const handlePresetClick = (presetRange: DateRange) => {
    onRangeChange?.(presetRange);
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn('w-full sm:w-[260px] justify-start text-left font-normal', !range && 'text-muted-foreground')}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {range?.from ? (
              range.to ? (
                <>
                  {format(range.from, 'LLL dd, y')} - {format(range.to, 'LLL dd, y')}
                </>
              ) : (
                format(range.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 flex" align={align}>
            <div className="flex flex-col space-y-2 p-2 border-r">
                {presets.map((preset) => (
                    <Button
                        key={preset.name}
                        variant="ghost"
                        className="justify-start"
                        onClick={() => handlePresetClick(preset.range)}
                    >
                        {preset.name}
                    </Button>
                ))}
            </div>
            <Calendar
                initialFocus
                mode="range"
                defaultMonth={range?.from}
                selected={range}
                onSelect={onRangeChange}
                numberOfMonths={2}
            />
        </PopoverContent>
      </Popover>
    </div>
  );
}
