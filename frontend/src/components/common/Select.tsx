import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

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
  searchable?: boolean;
  searchPlaceholder?: string;
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

/**
 * Menghitung skor kemiripan antara label opsi dan teks yang diketik.
 * Skor lebih tinggi = lebih mirip:
 * - 100: Sama persis
 * - 80: Awalan kata (starts with)
 * - 70: Awalan salah satu kata di dalam teks (word boundary)
 * - 60: Mengandung substring query
 * - 55: Mengandung seluruh kata query (bisa acak urutan)
 * - 40+: Mengandung sebagian kata query
 * - 30: Subsequence match (huruf berurutan meskipun ada jeda)
 * - 0: Tidak mirip sama sekali
 */
function calculateOptionSimilarity(label: string, query: string): number {
  const cleanLabel = label.toLowerCase().trim();
  const cleanQuery = query.toLowerCase().trim();

  if (!cleanQuery) return 1;
  if (cleanLabel === cleanQuery) return 100; // Exact match
  if (cleanLabel.startsWith(cleanQuery)) return 80; // Starts with query

  // Word boundary match: e.g. "PMB" in "Sosialisasi PMB"
  const words = cleanLabel.split(/[\s\-_(),.]+/).filter(Boolean);
  if (words.some((w) => w.startsWith(cleanQuery))) return 70;

  // Contains full query as substring
  const substringIndex = cleanLabel.indexOf(cleanQuery);
  if (substringIndex !== -1) {
    return Math.max(50, 65 - substringIndex);
  }

  // All words in query appear in label (e.g. "smk slawi" in "Sosialisasi PMB SMK YPE Slawi")
  const queryWords = cleanQuery.split(/\s+/).filter(Boolean);
  if (queryWords.length > 1 && queryWords.every((qw) => cleanLabel.includes(qw))) {
    return 55;
  }

  // Any query word appears in label
  const matchingWordCount = queryWords.filter((qw) => cleanLabel.includes(qw)).length;
  if (matchingWordCount > 0) {
    return 40 + matchingWordCount * 5;
  }

  // Fuzzy subsequence match (e.g. "kord" in "Koordinator")
  let li = 0;
  let qi = 0;
  while (li < cleanLabel.length && qi < cleanQuery.length) {
    if (cleanLabel[li] === cleanQuery[qi]) {
      qi++;
    }
    li++;
  }
  if (qi === cleanQuery.length) {
    return 30;
  }

  return 0; // No match
}

/**
 * Menandai (highlight) bagian teks yang cocok dengan ketikan pengguna
 */
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) {
    return text;
  }
  return (
    <>
      {text.substring(0, index)}
      <span className="font-extrabold text-blue-600 underline decoration-blue-300">
        {text.substring(index, index + lowerQuery.length)}
      </span>
      {text.substring(index + lowerQuery.length)}
    </>
  );
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      searchable = true,
      searchPlaceholder = 'Ketik untuk mencari...',
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
    const searchInputRef = useRef<HTMLInputElement>(null);
    const hiddenSelectRef = useRef<HTMLSelectElement | null>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
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
            label: childProps.children
              ? getTextFromReactNode(childProps.children)
              : String(childProps.value ?? ''),
            disabled: Boolean(childProps.disabled),
          });
        }
      });
      return opts;
    }, [options, children]);

    // Filter options based on similarity ranking
    const filteredOptions = useMemo(() => {
      if (!searchQuery.trim()) {
        return parsedOptions;
      }
      const scored: Array<SelectOption & { score: number }> = [];
      for (const opt of parsedOptions) {
        // Jangan buang opsi placeholder kosong jika tidak sedang mencari teks khusus
        const score = calculateOptionSimilarity(opt.label, searchQuery);
        if (score > 0) {
          scored.push({ ...opt, score });
        }
      }
      // Urutkan berdasarkan kemiripan tertinggi
      scored.sort((a, b) => b.score - a.score);
      return scored;
    }, [parsedOptions, searchQuery]);

    // Reset search and auto-focus input when dropdown opens
    useEffect(() => {
      if (isOpen) {
        setSearchQuery('');
        setHighlightedIndex(-1);
        if (searchable) {
          const timer = setTimeout(() => {
            searchInputRef.current?.focus();
          }, 30);
          return () => clearTimeout(timer);
        }
      }
    }, [isOpen, searchable]);

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
      setSearchQuery('');

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

    // Keyboard navigation inside search input
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredOptions.length > 0) {
          const targetIdx = highlightedIndex >= 0 ? highlightedIndex : 0;
          const targetOpt = filteredOptions[targetIdx];
          if (targetOpt && !targetOpt.disabled) {
            handleSelectOption(targetOpt.value, targetOpt.disabled);
          }
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    // Type directly on trigger button to open & start search
    const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      } else if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        searchable
      ) {
        e.preventDefault();
        setIsOpen(true);
        setSearchQuery(e.key);
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
          onKeyDown={handleTriggerKeyDown}
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
          <span
            className={`truncate ${
              !selectedOption && placeholder ? 'text-slate-400' : 'font-medium'
            }`}
          >
            {displayLabel}
          </span>
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'
            }`}
          />
        </button>

        {/* Custom Modern Floating Options Popover with Search Bar */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xl p-1.5 max-h-72 flex flex-col animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Search Input Box */}
            {searchable && (
              <div className="p-1.5 pb-2 border-b border-slate-100 flex-shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={searchPlaceholder}
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200/90 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-clay-inset"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery('');
                        setHighlightedIndex(-1);
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="overflow-y-auto max-h-60 space-y-0.5 p-1">
              {filteredOptions.length === 0 ? (
                <div className="py-4 px-3 text-xs text-center text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-600">
                    Tidak ada pilihan yang cocok
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Tidak ditemukan opsi untuk &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = String(opt.value) === String(internalValue);
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <div
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectOption(opt.value, opt.disabled)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`px-3 py-2 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer select-none ${
                        opt.disabled
                          ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400'
                          : isSelected
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : isHighlighted
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <span className="truncate pr-2">
                        {highlightMatch(opt.label, searchQuery)}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-white flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
        {!error && helperText && (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
