import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  placeholder?: string;
}

function getTextFromReactNode(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(getTextFromReactNode).join('');
  }
  if (React.isValidElement(node) && node.props && (node.props as any).children) {
    return getTextFromReactNode((node.props as any).children);
  }
  return '';
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      children,
      className = '',
      id,
      value,
      defaultValue,
      onChange,
      disabled,
      required,
      name,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const containerRef = useRef<HTMLDivElement>(null);
    const hiddenSelectRef = useRef<HTMLSelectElement | null>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState<string>(
      value !== undefined ? String(value) : defaultValue !== undefined ? String(defaultValue) : ''
    );

    // Sync when controlled value changes
    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(String(value));
      }
    }, [value]);

    // Parse options from either `options` prop or `children` (<option> tags)
    const parsedOptions: SelectOption[] = useMemo(() => {
      if (options && options.length > 0) {
        return options;
      }
      const opts: SelectOption[] = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === 'option') {
          const childProps = child.props as any;
          opts.push({
            value: String(childProps.value ?? ''),
            label: childProps.children ? getTextFromReactNode(childProps.children) : String(childProps.value ?? ''),
            disabled: Boolean(childProps.disabled),
          });
        }
      });
      return opts;
    }, [options, children]);

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        window.addEventListener('keydown', handleKeyDown);
      }
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Find label of currently selected option
    const selectedOption = useMemo(() => {
      return parsedOptions.find((opt) => String(opt.value) === String(internalValue));
    }, [parsedOptions, internalValue]);

    const displayLabel = selectedOption
      ? selectedOption.label
      : placeholder || (parsedOptions.length > 0 ? parsedOptions[0].label : 'Pilih opsi...');

    const handleSelectOption = (optValue: string, isDisabled?: boolean) => {
      if (isDisabled || disabled) return;

      setInternalValue(optValue);
      setIsOpen(false);

      // Trigger standard React onChange event
      if (onChange) {
        const syntheticEvent = {
          target: { value: optValue, name: name || '' },
          currentTarget: { value: optValue, name: name || '' },
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }

      // Sync hidden native select
      if (hiddenSelectRef.current) {
        hiddenSelectRef.current.value = optValue;
        const nativeEvent = new Event('change', { bubbles: true });
        hiddenSelectRef.current.dispatchEvent(nativeEvent);
      }
    };

    return (
      <div ref={containerRef} className="w-full relative">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-slate-700 mb-1.5 cursor-pointer"
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
          >
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}

        {/* Hidden native select for form accessibility and React ref passing */}
        <select
          ref={(node) => {
            hiddenSelectRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLSelectElement | null>).current = node;
            }
          }}
          id={selectId}
          name={name}
          value={internalValue}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className="sr-only pointer-events-none"
          tabIndex={-1}
          aria-hidden="true"
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {parsedOptions.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom Modern Styled Dropdown Trigger Button */}
        <button
          type="button"
          id={selectId ? `${selectId}-trigger` : undefined}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`w-full flex items-center justify-between gap-2 bg-slate-50 border border-slate-200/90 rounded-clay-sm px-3.5 py-2 text-sm text-slate-800 shadow-clay-inset transition-all text-left cursor-pointer focus:outline-none ${
            isOpen
              ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-md'
              : 'hover:bg-white hover:border-slate-300'
          } ${
            error ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-100' : ''
          } ${disabled ? 'opacity-50 bg-slate-100 cursor-not-allowed' : ''} ${className}`}
        >
          <span className={`truncate ${!selectedOption && placeholder ? 'text-slate-400' : 'font-medium'}`}>
            {displayLabel}
          </span>
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'
            }`}
          />
        </button>

        {/* Custom Modern Floating Options Popover */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xl p-1.5 max-h-64 overflow-y-auto space-y-0.5 animate-in fade-in-0 zoom-in-95 duration-150">
            {parsedOptions.length === 0 ? (
              <div className="py-3 px-3 text-xs text-center text-slate-400">
                Tidak ada pilihan
              </div>
            ) : (
              parsedOptions.map((opt) => {
                const isSelected = String(opt.value) === String(internalValue);

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOption(opt.value, opt.disabled)}
                    className={`px-3 py-2 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer select-none ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400'
                        : isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-blue-50/80 hover:text-blue-700 font-medium'
                    }`}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-white flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
        {!error && helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
