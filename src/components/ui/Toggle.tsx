import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: ToggleProps) {
  return (
    <label
      className={`flex items-start gap-3 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="pt-0.5">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`
            relative inline-flex h-6 w-11 shrink-0 rounded-full
            transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
            ${checked ? 'bg-primary' : 'bg-muted'}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full
              bg-white shadow-lg ring-0 transition duration-200 ease-in-out
              ${checked ? 'translate-x-5' : 'translate-x-0.5'}
              mt-0.5
            `}
          />
        </button>
      </div>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-medium text-foreground">{label}</span>
          )}
          {description && (
            <span className="text-sm text-muted-foreground">{description}</span>
          )}
        </div>
      )}
    </label>
  );
}
