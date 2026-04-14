"use client"

import { useState } from 'react';
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Icon } from './Icon';
import { iconList } from '@/lib/icons';
import { ScrollArea } from './ui/scroll-area';

interface IconPickerProps {
    value: string;
    onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                    <Icon name={value} />
                    <span>{value}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0">
                <ScrollArea className="h-72">
                    <div className="p-2 grid grid-cols-5 gap-2">
                        {iconList.map((icon) => (
                            <Button
                                key={icon}
                                variant={value === icon ? "default" : "ghost"}
                                size="icon"
                                onClick={() => {
                                    onChange(icon);
                                    setIsOpen(false);
                                }}
                            >
                                <Icon name={icon} />
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
