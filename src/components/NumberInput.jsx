import { useState, useRef, useEffect } from 'react';

/**
 * NumberInput - A user-friendly number input with:
 * - Clear focus indicator (blue ring)
 * - Visible cursor position
 * - Quick clear button (X)
 * - Optional live formatting
 * - Easy deletion
 */
export default function NumberInput({
  value,
  onChange,
  placeholder = '0',
  suffix,
  label,
  size = 'normal', // 'normal' | 'large'
  className = '',
  showClearButton = true,
  formatDisplay = true,
  theme = {},
}) {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Parse numeric value for formatting
  const numericValue = parseFloat(String(value).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

  // Format for display (only when not focused)
  const displayValue = formatDisplay && !isFocused && numericValue > 0
    ? new Intl.NumberFormat('de-DE').format(numericValue)
    : value;

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ target: { value: '' } });
    inputRef.current?.focus();
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  // Size classes
  const sizeClasses = size === 'large'
    ? 'text-3xl py-4 px-4'
    : 'text-xl py-3 px-4';

  const containerSizeClasses = size === 'large'
    ? 'min-h-[72px]'
    : 'min-h-[56px]';

  // Theme-aware colors
  const bgColor = theme.inputBg || 'bg-gray-50';
  const textColor = theme.textPrimary || 'text-gray-900';
  const mutedColor = theme.textMuted || 'text-gray-400';

  return (
    <div className={className}>
      {label && (
        <label className={`block text-xs uppercase tracking-wider text-center mb-2 ${mutedColor}`}>
          {label}
        </label>
      )}

      <div
        onClick={handleContainerClick}
        className={`
          relative rounded-xl ${bgColor} ${containerSizeClasses}
          cursor-text transition-all duration-150
          ${isFocused
            ? 'ring-2 ring-blue-500 ring-offset-1'
            : 'ring-1 ring-transparent hover:ring-gray-300'
          }
        `}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={isFocused ? value : displayValue}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`
            w-full h-full ${sizeClasses}
            font-bold ${textColor} tabular-nums
            bg-transparent border-none outline-none
            placeholder-gray-400 text-center
            ${suffix && showClearButton ? 'pr-16' : suffix ? 'pr-10' : showClearButton && value ? 'pr-10' : ''}
          `}
        />

        {/* Suffix (e.g., €, AED) */}
        {suffix && (
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${mutedColor} font-medium pointer-events-none
            ${showClearButton && value ? 'right-10' : 'right-3'}
          `}>
            {suffix}
          </span>
        )}

        {/* Clear button */}
        {showClearButton && value && (
          <button
            type="button"
            onClick={handleClear}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2
              w-7 h-7 rounded-full
              flex items-center justify-center
              bg-gray-200 hover:bg-gray-300 active:bg-gray-400
              text-gray-600 hover:text-gray-800
              transition-colors
            `}
            tabIndex={-1}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
