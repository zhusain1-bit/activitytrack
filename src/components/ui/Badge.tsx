import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    destructive: 'bg-destructive/10 text-destructive',
    outline: 'border border-border text-foreground bg-transparent',
  };

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
