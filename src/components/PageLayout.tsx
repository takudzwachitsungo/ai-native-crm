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
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex-1 overflow-y-auto">
        {title && (
          <div className="px-6 py-4 border-b border-border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {icon && <div className="text-primary">{icon}</div>}
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
                  {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
                </div>
              </div>
              {actions && <div>{actions}</div>}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
