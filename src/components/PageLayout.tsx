import { Header } from './Header';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageLayout({ children, title, subtitle, icon, actions }: PageLayoutProps) {
  return (
    <div className="flex h-full min-w-0 flex-col">
      <Header />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {title && (
          <div className="border-b border-border bg-card px-4 py-4 sm:px-5 lg:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {icon && <div className="text-primary">{icon}</div>}
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
                  {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
                </div>
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
