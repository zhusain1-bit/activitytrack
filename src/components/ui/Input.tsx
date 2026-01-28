import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}: InputProps) {
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
      <input
        id={inputId}
        className={`
          w-full h-10 px-3 rounded-lg border bg-background text-foreground
          placeholder:text-muted-foreground
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-destructive' : 'border-input'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {helperText && !error && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Textarea({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}: TextareaProps) {
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
      <textarea
        id={inputId}
        className={`
          w-full px-3 py-2 rounded-lg border bg-background text-foreground
          placeholder:text-muted-foreground resize-none
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-destructive' : 'border-input'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {helperText && !error && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
