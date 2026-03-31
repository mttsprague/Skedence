import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Reusable centred empty-state card. */
export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-12 text-center">
      <div className="text-gray-300 flex justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-pva-navy mb-2">{title}</h3>
      {description && <p className="text-gray-500 text-sm max-w-xs mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
