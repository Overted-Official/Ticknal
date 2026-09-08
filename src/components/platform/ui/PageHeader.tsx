import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({ title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <header className={`app-header flex-wrap shrink-0 select-none ${className}`.trim()}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="status-dot" aria-hidden="true" />
          <h1 className="page-title">{title}</h1>
        </div>
        <p className="page-subtitle mt-1 max-w-3xl">{description}</p>
      </div>

      {actions ? (
        <div className="flex items-center gap-2.5 flex-wrap">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
