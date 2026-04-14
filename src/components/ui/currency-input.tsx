

"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { getUserSettings } from "@/lib/firestore";
import type { UserSettings } from "@/types";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const { user } = useAuth();
    const [settings, setSettings] = React.useState<UserSettings | null>(null);
    const [displayValue, setDisplayValue] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);
    const symbolRef = React.useRef<HTMLSpanElement>(null);
    const [symbolWidth, setSymbolWidth] = React.useState(0);

    React.useImperativeHandle(ref, () => inputRef.current!);

    React.useEffect(() => {
        if(user) {
            getUserSettings(user.uid).then(setSettings);
        }
    }, [user]);

    const currency = settings?.currency || 'USD';
    const currencySymbol = new Intl.NumberFormat('en-US', { style: 'currency', currency }).formatToParts(0).find(part => part.type === 'currency')?.value || '$';

    React.useEffect(() => {
        if (symbolRef.current) {
            setSymbolWidth(symbolRef.current.offsetWidth);
        }
    }, [currencySymbol]);

    const formatCurrency = React.useCallback((num: number) => {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }, []);

    React.useEffect(() => {
      if (document.activeElement !== inputRef.current) {
        setDisplayValue(formatCurrency(value));
      }
    }, [value, formatCurrency]);
    
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setDisplayValue(value === 0 ? "" : String(value));
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const numericValue = parseFloat(e.target.value) || 0;
        onChange(numericValue);
        setDisplayValue(formatCurrency(numericValue));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        if (/^[0-9]*\.?[0-9]{0,2}$/.test(rawValue) || rawValue === "") {
            setDisplayValue(rawValue);
            const numericValue = parseFloat(rawValue) || 0;
            onChange(numericValue);
        }
    };

    return (
        <div className="relative">
            <span ref={symbolRef} className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                {currencySymbol}
            </span>
            <Input
            {...props}
            ref={inputRef}
            value={displayValue}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            style={{ paddingLeft: `${symbolWidth + 8}px` }} // 8px for extra spacing
            inputMode="decimal"
            />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };

