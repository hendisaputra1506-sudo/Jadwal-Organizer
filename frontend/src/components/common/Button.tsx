import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5 font-medium',
    md: 'px-4 py-2 text-sm rounded-clay-sm gap-2 font-medium',
    lg: 'px-6 py-2.5 text-base rounded-clay gap-2.5 font-semibold',
  };

  const variantClasses = {
    primary:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-clay-btn hover:shadow-clay-btn-hover active:shadow-clay-btn-active border-t border-blue-400/40',
    secondary:
      'bg-slate-100 hover:bg-slate-200/80 text-slate-800 shadow-clay-btn hover:shadow-clay-btn-hover active:shadow-clay-btn-active border border-slate-200/80',
    outline:
      'bg-white/90 hover:bg-white text-slate-700 shadow-clay-sm hover:shadow-clay-btn border border-slate-200 active:shadow-clay-inset',
    danger:
      'bg-rose-50 hover:bg-rose-100 text-rose-700 shadow-clay-btn hover:shadow-clay-btn-hover active:shadow-clay-btn-active border border-rose-200',
    ghost:
      'bg-transparent hover:bg-slate-200/60 text-slate-700 active:bg-slate-200',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
      {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};
