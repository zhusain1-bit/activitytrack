import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
}

export function Select({
  label,
  error,
  options,
  placeholder,
  className = '',
  id,
  value,
  onChange,
  ...props
}: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={inputId}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={`
            w-full h-10 px-3 pr-10 rounded-lg border bg-background text-foreground
            appearance-none cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-destructive' : 'border-input'}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
