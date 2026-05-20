import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'numeric';
  disabled?: boolean;
}

export function FormField({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  required,
  hint,
  error,
  autoComplete,
  inputMode,
  disabled,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[0.75rem] font-medium text-foreground">
        {label}
        {!required && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        disabled={disabled}
        className={`
          w-full h-10 px-3 rounded-lg border bg-card text-[0.8125rem] text-foreground
          placeholder:text-muted-foreground/60
          transition-all duration-150 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-offset-0
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error 
            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
            : 'border-border focus:ring-primary/20 focus:border-primary hover:border-gray-300'
          }
        `}
      />
      {hint && !error && (
        <p className="text-[0.6875rem] text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-[0.6875rem] text-red-500">{error}</p>
      )}
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  autoComplete?: string;
  disabled?: boolean;
}

export function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  required,
  error,
  autoComplete,
  disabled,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[0.75rem] font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`
            w-full h-10 px-3 pr-10 rounded-lg border bg-card text-[0.8125rem] text-foreground
            placeholder:text-muted-foreground/60
            transition-all duration-150 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error 
              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400'
              : 'border-border focus:ring-primary/20 focus:border-primary hover:border-gray-300'
            }
          `}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {error && (
        <p className="text-[0.6875rem] text-red-500">{error}</p>
      )}
    </div>
  );
}

interface PrimaryButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PrimaryButton({ children, type = 'button', loading, disabled, onClick, className = '' }: PrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      onClick={onClick}
      className={`
        w-full h-10 rounded-lg font-medium text-[0.8125rem]
        bg-primary
        text-white shadow-sm
        hover:bg-primary/90
        focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-150 ease-in-out
        flex items-center justify-center gap-2
        ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
