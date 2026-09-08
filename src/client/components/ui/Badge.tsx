import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full transition-colors',
  {
    variants: {
      variant: {
        violet: 'bg-violet-500/20 text-violet-300 border border-violet-500/20',
        cyan: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/20',
        green: 'bg-status-green-500/20 text-status-green-300 border border-status-green-500/20',
        amber: 'bg-status-amber-500/20 text-status-amber-300 border border-status-amber-500/20',
        red: 'bg-status-red-500/20 text-status-red-300 border border-status-red-500/20',
        graphite: 'bg-graphite-800 text-graphite-300 border border-graphite-700',
        white: 'bg-white/10 text-white border border-white/10',
      },
    },
    defaultVariants: {
      variant: 'graphite',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={`${badgeVariants({ variant })} ${className || ''}`} {...props} />
  );
}

export { Badge, badgeVariants };
