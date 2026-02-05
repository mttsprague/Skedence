import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface AlertProps {
  children: ReactNode;
  className?: string;
}

export function Alert({ children, className }: AlertProps) {
  return (
    <div
      className={cn(
        'relative w-full rounded-lg border border-blue-200 bg-blue-50 p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-blue-600 [&>svg~*]:pl-7',
        className
      )}
    >
      {children}
    </div>
  );
}

export function AlertDescription({ children, className }: AlertProps) {
  return <div className={cn('text-sm text-blue-900', className)}>{children}</div>;
}
