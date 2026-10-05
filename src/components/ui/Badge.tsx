import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'outline';
  status?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'VOIDED' | 'ACTIVE' | 'PLANNED' | 'COMPLETED' | 'CANCELLED';
}

export function Badge({ className, variant, status, children, ...props }: BadgeProps) {
  let resolvedVariant = variant || 'default';

  if (status) {
    switch (status) {
      case 'APPROVED':
      case 'ACTIVE':
      case 'COMPLETED':
        resolvedVariant = 'success';
        break;
      case 'PENDING_APPROVAL':
      case 'PLANNED':
        resolvedVariant = 'warning';
        break;
      case 'REJECTED':
      case 'CANCELLED':
        resolvedVariant = 'danger';
        break;
      case 'VOIDED':
        resolvedVariant = 'secondary';
        break;
      case 'DRAFT':
        resolvedVariant = 'outline';
        break;
    }
  }

  const variants = {
    default: 'bg-slate-900 text-white',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200 font-medium',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200 font-medium',
    info: 'bg-sky-50 text-sky-700 border border-sky-200 font-medium',
    secondary: 'bg-slate-100 text-slate-700 border border-slate-200',
    outline: 'border border-slate-300 text-slate-600 bg-white',
  };

  const displayText = status ? status.replace('_', ' ') : children;

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs tracking-wide uppercase transition-colors',
          variants[resolvedVariant],
          className
        )
      )}
      {...props}
    >
      {displayText}
    </span>
  );
}
