
"use client";

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { ScrollArea } from "../ui/scroll-area"
import { Icon } from "../Icon";


interface MultiSelectFilterProps {
  title: string;
  options: {
    value: string;
    label: string;
    icon?: string;
  }[];
  selectedValues: string[];
  onSelectedChange: (selected: string[]) => void;
  className?: string;
}

export function MultiSelectFilter({
  title,
  options,
  selectedValues,
  onSelectedChange,
  className,
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onSelectedChange(newSelectedValues);
  };
  
  const getTriggerText = () => {
    if (selectedValues.length === 0) return `Select ${title}...`;
    if (selectedValues.length === options.length) return `All ${title}`;
    if (selectedValues.length === 1) {
        const selectedOption = options.find(o => o.value === selectedValues[0]);
        return selectedOption?.label || `1 ${title} selected`;
    }
    return `${selectedValues.length} ${title} selected`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full sm:w-[200px] justify-between", className)}
        >
          <span className="truncate">{getTriggerText()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder={`Search ${title.toLowerCase()}...`} />
           <ScrollArea className="h-64">
            <CommandList>
                <CommandEmpty>No {title.toLowerCase()} found.</CommandEmpty>
                <CommandGroup>
                {options.map((option) => (
                    <CommandItem
                        key={option.value}
                        value={option.label}
                        onSelect={() => handleSelect(option.value)}
                        className="flex items-center"
                    >
                    <Checkbox
                        id={`select-${option.value}`}
                        checked={selectedValues.includes(option.value)}
                        className="mr-2"
                    />
                    {option.icon && <Icon name={option.icon} className="mr-2 h-4 w-4" />}
                    <label
                        htmlFor={`select-${option.value}`}
                        className="flex-1 cursor-pointer"
                    >
                        {option.label}
                    </label>
                    </CommandItem>
                ))}
                </CommandGroup>
            </CommandList>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
