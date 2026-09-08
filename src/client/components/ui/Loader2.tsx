import * as React from 'react';

interface Loader2Props extends React.SVGAttributes<SVGElement> {
  size?: number;
}

const defaultProps: Partial<Loader2Props> = {
  size: 24,
  strokeWidth: 2,
  stroke: 'currentColor',
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function Loader2({ size = 24, ...props }: Loader2Props) {
  const iconSize = size || 24;
  return (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      {...defaultProps}
      {...props}
      className={`${props.className || ''} animate-spin`}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
