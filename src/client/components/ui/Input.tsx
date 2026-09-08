import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`
          flex h-10 w-full rounded-md border bg-surface-raised px-3 py-2 text-sm text-graphite-100
          placeholder-graphite-500
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 focus-visible:ring-offset-1 focus-visible:ring-offset-graphite-999
          disabled:cursor-not-allowed disabled:opacity-50
          transition-colors
          ${error
            ? 'border-status-red-500 focus-visible:ring-status-red-500'
            : 'border-graphite-700 hover:border-graphite-600'
          }
          ${className || ''}
        `}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={`
          flex min-h-[80px] w-full rounded-md border bg-surface-raised px-3 py-2 text-sm text-graphite-100
          placeholder-graphite-500
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 focus-visible:ring-offset-1 focus-visible:ring-offset-graphite-999
          disabled:cursor-not-allowed disabled:opacity-50
          transition-colors
          border-graphite-700 hover:border-graphite-600
          resize-y
          ${className || ''}
        `}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={`text-sm font-medium text-graphite-300 ${className || ''}`}
      {...props}
    />
  )
);
Label.displayName = 'Label';

const FormField = ({
  label,
  error,
  children,
  className,
}: {
  label?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`space-y-1.5 ${className || ''}`}>
      {label && <Label>{label}</Label>}
      {children}
      {error && <p className="text-xs text-status-red-400">{error}</p>}
    </div>
  );
};

export { Input, Textarea, Label, FormField };
