import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'card' | 'rect';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  style,
  ...props
}) => {
  const variantClasses = {
    text: 'h-4 rounded-md',
    card: 'h-32 rounded-clay',
    rect: 'rounded-clay-sm',
  };

  return (
    <div
      className={`animate-pulse bg-slate-200/80 ${variantClasses[variant]} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="bg-white p-5 rounded-clay border border-white/80 shadow-clay-card space-y-3">
    <div className="flex justify-between items-center">
      <Skeleton width="40%" height={16} />
      <Skeleton width="20%" height={20} className="rounded-full" />
    </div>
    <Skeleton width="75%" height={20} />
    <div className="flex gap-2 pt-2">
      <Skeleton width="30%" height={14} />
      <Skeleton width="30%" height={14} />
    </div>
  </div>
);
