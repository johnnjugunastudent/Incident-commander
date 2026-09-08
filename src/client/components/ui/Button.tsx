import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-999 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-violet-600 text-white hover:bg-violet-500 active:bg-violet-700 shadow-glow-violet',
        secondary:
          'bg-graphite-800 text-graphite-200 border border-graphite-700 hover:bg-graphite-700 hover:text-white active:bg-graphite-600',
        ghost:
          'text-graphite-300 hover:bg-graphite-800 hover:text-white active:bg-graphite-700',
        success:
          'bg-status-green-600 text-white hover:bg-status-green-500 active:bg-status-green-700',
        danger:
          'bg-status-red-600 text-white hover:bg-status-red-500 active:bg-status-red-700',
        amber:
          'bg-status-amber-600 text-white hover:bg-status-amber-500 active:bg-status-amber-700',
        link: 'text-violet-400 hover:text-violet-300 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={`${buttonVariants({ variant, size, className })}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
