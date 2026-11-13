import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, rows = 4, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-700 mb-1.5">
            {label}
            {props.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`w-full bg-slate-50 border border-slate-200/90 rounded-clay-sm p-3 text-sm text-slate-800 placeholder-slate-400 shadow-clay-inset transition-all focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:bg-slate-100 ${
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
        {!error && helperText && <p className="mt-1 text-xs text-slate-500 leading-relaxed">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
